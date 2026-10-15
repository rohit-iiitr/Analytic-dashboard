# Project Approach: GitHub Repository Analytics Dashboard

Is document mein bataya gaya hai ki project ko kaise approach kiya gaya, requirements padhne se lekar final application tak. [README](README.md) mein setup, features aur API reference hai. Ye file samjhati hai ki un sab ke peeche reasoning kya thi.

---

## 1. Requirements ko samajhna

Assignment mein ek full-stack application banana tha jo:

1. Keyword se public GitHub repositories search kare, pagination ke saath.
2. Kisi repository ka details page dikhaye: core info, latest commits, top contributors, aur open issues.
3. User ko repositories database mein save karne de, unki list dikhaye, aur remove karne de.
4. Saara GitHub traffic hamare apne backend ke through jaaye.
5. Paanch specific failure cases ko bina crash hue handle kare: GitHub errors ya downtime, invalid ya deleted repositories, empty search results, duplicate saves, aur rate limits.

Design ko features se zyada in failure cases ne shape kiya. Data search karna aur dikhana toh simple hai. Asli kaam hai ye sab reliably karna jab GitHub, network ya database gadbad kare. Isliye plan ye tha ki pehle error model design karo, aur phir features uske upar build karo.

---

## 2. Stack choose karna

| Layer | Choice | Reason |
|---|---|---|
| Frontend | Next.js (App Router), React, Tailwind CSS | File-based routing teen pages (`/`, `/repo/[owner]/[name]`, `/saved`) ke liye perfect fit hai. Tailwind se styling fast aur consistent rehti hai, bina kisi component library ke. |
| Backend | Node.js, Express 5 | Express 5 `async` handlers mein throw hue errors ko khud error middleware tak forward kar deta hai, isliye routes mein `try/catch` boilerplate ki zaroorat nahi padti. |
| Database | MongoDB with Mongoose | Saved repositories simple documents hain. Mongoose schema validation aur unique indexes deta hai. |
| HTTP client | Native `fetch` (Node 18+) | Koi extra dependency nahi. `AbortSignal.timeout` se request timeouts free mein mil jaate hain. |
| Cache | In-memory TTL map | Ek server ke liye kaafi hai. Redis install ya run karne ki zaroorat nahi. |

Backend mein sirf chaar runtime dependencies hain (`express`, `mongoose`, `cors`, `dotenv`). Ye jaan-boojhkar kiya gaya: kam moving parts matlab project run aur review karna aasaan.

---

## 3. Architecture

```
Browser (Next.js)  ──►  Express API  ──►  GitHub REST API
                            │
                            └──────►  MongoDB (saved repositories)
```

Key decisions:

- **Browser kabhi directly GitHub ko call nahi karta.** GitHub token server par hi rehta hai, caching aur rate-limit tracking ek hi jagah hoti hai, aur frontend ko sirf ek API se baat karni padti hai.
- **Backend GitHub data ko normalize karta hai.** GitHub ke bade snake_case payloads ko ek chhote camelCase shape mein map kiya jaata hai (`normalizeRepo`, `normalizeCommit`, `normalizeContributor`). Frontend kabhi GitHub ke raw format par depend nahi karta.
- **Layered backend.** Har layer ka ek hi kaam hai:
  - `routes/` input validate karte hain aur HTTP responses shape karte hain.
  - `services/githubService.js` mein business logic hai: search, details, caching, normalization.
  - `services/githubClient.js` hi akela code hai jo GitHub ko HTTP calls karta hai. Ye timeouts, rate-limit tracking aur error mapping bhi handle karta hai.
  - `middleware/errorHandler.js` har error ko same JSON shape mein convert karta hai.

---

## 4. Build order

### Step 1: Backend foundation

- `config/env.js` environment variables load karta hai aur safe defaults par fall back karta hai, taaki incomplete `.env` ke saath bhi server start ho jaaye.
- `utils/AppError.js` ek single error class hai jo HTTP status, machine-readable `code`, aur optional extra fields jaise `retryAfter` carry karti hai.
- `middleware/errorHandler.js` sab kuch `{ error: { message, code, ... } }` mein convert karta hai. Isme `AppError`s, malformed JSON, Mongoose validation aur cast errors, aur unexpected crashes sab cover hote hain. Response bhejne se pehle internal details (jaise raw GitHub status) hata diye jaate hain.

Aage ka har feature isi par depend karta hai. Koi bhi code path `throw new AppError(...)` kar sakta hai aur client ko ek consistent, readable response milta hai.

### Step 2: GitHub client

`githubClient.js` `fetch` ko wrap karta hai aur har us tareeke ko handle karta hai jisse call fail ho sakti hai:

| Kya hota hai | Response |
|---|---|
| Network failure | `503 GITHUB_UNREACHABLE` |
| 10 seconds mein reply nahi aaya | `504 GITHUB_TIMEOUT` |
| GitHub 5xx return kare | `502 GITHUB_UNAVAILABLE` |
| Body valid JSON nahi hai | `502 GITHUB_INVALID_RESPONSE` |
| Galat token (401) | `502 GITHUB_AUTH_FAILED` (ye server misconfiguration hai, user ki galti nahi) |
| 404 / 451 / 422 | `404 NOT_FOUND` / `451 REPO_UNAVAILABLE` / `400 INVALID_REQUEST` |
| Rate limited | `429 RATE_LIMITED`, saath mein `retryAfter` aur `resetAt` |

**Rate limiting** ko do hisson mein handle kiya gaya:

1. **Tracking.** Har response ke baad client `x-ratelimit-*` headers ko `core` aur `search` buckets ke liye alag-alag record karta hai, kyunki GitHub dono ko independently limit karta hai.
2. **Short-circuiting.** Har request se pehle, agar pata hai ki bucket khaali hai aur reset time abhi nahi aaya, toh client GitHub ko call kiye bina turant `429` throw kar deta hai. Isse requests waste nahi hoti aur abuse ke liye flag hone se bhi bachte hain.

Primary limits (`x-ratelimit-remaining: 0`) aur secondary limits (`retry-after` header) dono same `429` response dete hain, isliye frontend ko sirf ek hi case handle karna padta hai.

### Step 3: Caching ke saath repository search

- `validators.js` kisi bhi network call se pehle input check karta hai: keyword empty nahi hona chahiye aur max 256 characters ka ho, `sort` allowed value ho, aur `page` aur `perPage` positive integers hon.
- GitHub maximum 1,000 search results hi deta hai. Backend usse aage ke pages ko `400 PAGE_OUT_OF_RANGE` se reject karta hai aur `totalPages` ko bhi usi hisaab se cap karta hai.
- Results `TtlCache` mein 5 minute ke liye cache hote hain. Cache key hai lower-case query + sort, page aur page size. Cache ka ek size cap hai, aur ye pehle expired entries hatata hai, phir sabse purani. Responses mein `cached`, `cachedAt`, aur `X-Cache: HIT|MISS` header hota hai.
- Cache rate limits mein bhi madad karta hai: jab GitHub requests refuse kar raha ho, tab bhi cached search kaam karti hai.

### Step 4: Repository details

Details endpoint ko chaar GitHub calls chahiye: repository info, commits, contributors, aur open issue count.

- **Repository info** wali call sabse pehle chalti hai. Agar ye fail ho, toh poori request fail hoti hai, kyunki iske bina dikhane ko kuch hai hi nahi. 404 ko `REPO_NOT_FOUND` mein convert kiya jaata hai, is message ke saath ki repository private, renamed ya deleted ho sakti hai.
- Baaki teen calls **`Promise.allSettled` ke saath parallel** mein chalti hain. Har ek apna `{ data, error }` return karti hai, isliye agar contributors call fail ho bhi jaaye toh commits chhupte nahi.
- **Open issues** ke liye GitHub ka issue search (`is:issue is:open`) use hota hai, kyunki repository ka `open_issues_count` pull requests ko bhi count karta hai. Agar wo search fail ho, toh response `open_issues_count` par fall back karta hai aur `includesPullRequests: true` set karta hai, taaki UI imaandari se label kar sake.
- **Empty repositories** par GitHub commits endpoint pe 409 return karta hai. Us case mein empty list return hoti hai, aur UI "no commits yet" dikhata hai.
- Owner aur repository names ko request se pehle GitHub ke naming rules ke against check kiya jaata hai, taaki malformed URLs ko bina GitHub call waste kiye `400 INVALID_REPOSITORY` mil jaaye.

### Step 5: Saved repositories (MongoDB)

- **Model.** `SavedRepository` ek chhota snapshot store karta hai (name, owner, description, language, stars, forks) aur saath mein `githubId`.
- **Duplicate prevention do levels par:**
  1. Route pehle `exists({ githubId })` check karta hai aur `409 ALREADY_SAVED` return karta hai.
  2. **`githubId` par unique index** us race condition ko pakadta hai jab do requests bilkul same moment par aati hain. Usse aane wala MongoDB `E11000` error bhi `409 ALREADY_SAVED` mein map hota hai.
- **Server client ke data par trust nahi karta.** Client sirf `{ owner, name }` bhejta hai. Backend GitHub se repository fetch karke confirm karta hai ki wo exist karti hai, aur GitHub ka canonical data store karta hai.
- `owner/name` ki jagah `githubId` use kiya gaya, kyunki repositories rename ya transfer ho sakti hain, lekin unka numeric ID same rehta hai.
- **Database outages.** Mongoose command buffering off kar di gayi hai, aur `/api/saved` par ek middleware database disconnect hone par hang hone ki bajaye turant `503 DB_UNAVAILABLE` return karta hai. Search aur details database use nahi karte, isliye wo chalte rehte hain. `config/db.js` background mein har 10 seconds par connection retry karta hai.

### Step 6: Server lifecycle

- `server.js` database connect hone se pehle hi listen karna shuru kar deta hai, taaki API turant use ho sake.
- Agar `GITHUB_TOKEN` set nahi hai toh startup par warning deta hai, kyunki unauthenticated limit sirf 60 requests per hour hai.
- `SIGINT` aur `SIGTERM` par cleanly shut down hota hai, HTTP server aur database connection dono band karke.
- `/api/health` database status, token configured hai ya nahi, aur latest known rate limits report karta hai, jo debugging mein kaam aata hai.

### Step 7: Frontend API layer aur shared state

- `lib/api.js` hi ek jagah hai jahan se frontend requests karta hai. Ye kisi bhi non-2xx response ko `status`, `code`, aur `retryAfter` wale `ApiError` mein badal deta hai, aur network failures ko ek friendly "backend is not running" message mein.
- Har request ek `AbortSignal` accept karti hai. Jab inputs change hote hain ya component unmount hota hai, effects in-flight requests cancel kar dete hain, taaki koi slow purana response kabhi naye response ko overwrite na kare.
- **`SavedReposContext`** saved list ek baar load karta hai aur poori app ke saath share karta hai. `githubId` se keyed ek `Map` ki wajah se koi bhi card ya details page turant check kar sakta hai ki "kya ye saved hai?". Ye har repository ke liye pending state bhi track karta hai, taaki save ya remove request chalte waqt buttons disable rahein.
- **`ToastContext`** chhote success, info aur error notifications dikhata hai.

### Step 8: Pages aur UI states

**Search (`/`)**
- Search keyword, sort order aur page number sirf component state mein nahi, balki **URL** mein rakhe jaate hain (`?q=react&sort=stars&page=2`). Isse results bookmark aur share ho sakte hain, aur browser ka back button expected tareeke se kaam karta hai.
- Har view ke explicit states hain: *idle* (suggestion chips ke saath), *loading* (skeletons), *error* (message aur retry), *empty* ("No repositories found"), aur *success*.
- Jab naya page load ho raha hota hai, purane results blank skeleton par flash hone ki bajaye kam opacity ke saath screen par bane rehte hain.
- "Served from cache" badge aur GitHub ke incomplete results ka notice backend ke behaviour ko visible banate hain.

**Details (`/repo/[owner]/[name]`)**
- Stat cards, repository metadata, commit list, aur contributors ko relative contribution bars ke saath dikhata hai.
- Agar kisi section ka data load nahi hua, toh wo section apna error khud dikhata hai, bilkul backend ke per-section results ki tarah.

**Saved (`/saved`)**
- Saved repositories ko remove buttons ke saath list karta hai. Iske apne loading, empty aur error states hain.

**Rate-limit UX**
- `429` aane par error state `retryAfter` se ek live countdown dikhata hai, aur **Try again** button tabhi enable hota hai jab countdown zero ho jaaye.

### Step 9: Edge cases aur hardening

Neeche diye har case ko check kiya gaya ki wo ek clear response de, crash kabhi na ho:

- Empty ya sirf whitespace wala keyword → form block karta hai aur API reject karti hai.
- URL mein invalid repository name → `400 INVALID_REPOSITORY`.
- Deleted ya private repository → `404 REPO_NOT_FOUND`.
- Same repository do baar save karna, do tabs se ek saath bhi → `409`, aur UI apni saved list resync kar leta hai.
- Pehle se removed cheez ko remove karna → `404 SAVED_NOT_FOUND`, aur UI phir bhi use list se hata deta hai.
- Invalid saved id → `400`. Malformed JSON body → `400 INVALID_JSON`. Unknown route → `404 ROUTE_NOT_FOUND`.
- Request body 10 KB tak capped. CORS sirf configured origins tak restricted. `x-powered-by` header disabled.
- Port 5000 ki jagah 4000 choose kiya gaya, kyunki macOS 5000 ko AirPlay ke liye use karta hai.

### Step 10: Documentation

README mein setup, environment variables, API, aur har mandatory challenge kaise handle hua, ye sab documented hai. Ye file reasoning document karti hai.

---

## 5. Trade-offs aur aage ke possible steps

| Current choice | Kyun | Bade scale par kya badlega |
|---|---|---|
| In-memory cache aur rate-limit state | Koi extra infrastructure nahi, ek server ke liye kaafi | Dono ko Redis mein move karna, taaki multiple server instances unhe share kar sakein |
| Koi user accounts nahi, ek shared saved list | Assignment mein required nahi tha | Auth, `userId` field, aur compound unique index `{ userId, githubId }` add karna |
| Saved data save ke time liya gaya snapshot hai | List karna fast, GitHub calls ki zaroorat nahi | Star aur fork counts update karne ke liye "refresh" action ya scheduled job add karna |
| Details page cached nahi hai | Data jaldi-jaldi badalta hai aur bada `core` quota use karta hai | Agar core limit problem bane toh chhota TTL cache add karna |
| Koi automated tests nahi | Time ki kami | API ke liye Jest/Supertest (GitHub mocked ke saath), aur main user flows ke liye Playwright add karna |

---

## 6. Summary

Ek line mein approach: **pehle ek single, predictable error model define karo, saara GitHub access ek careful client ke peeche rakho, aur har screen aur section ko explicit loading, empty, error aur success state do.** Phir features usi foundation par build kiye gaye, isliye har mandatory failure case backend aur frontend dono mein ek hi tareeke se handle hota hai.
