import { notFound } from "next/navigation";
import { getModelById } from "@/lib/services/modelService";
import { ModelViewer } from "@/components/viewer/ModelViewer";

export const dynamic = "force-dynamic";

interface ModelPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ModelPage({ params }: ModelPageProps) {
  const { id } = await params;
  const model = await getModelById(id);

  if (!model) {
    notFound();
  }

  return <ModelViewer model={model} />;
}

