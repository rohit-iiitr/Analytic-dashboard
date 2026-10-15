import RepoDetailsView from "@/components/RepoDetailsView";

export async function generateMetadata({ params }) {
  const { owner, name } = await params;
  return { title: `${owner}/${name} · GitHub Repository Analytics` };
}

export default async function RepoDetailsPage({ params }) {
  const { owner, name } = await params;
  return <RepoDetailsView owner={owner} name={name} />;
}
