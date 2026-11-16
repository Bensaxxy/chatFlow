import ConversationView from "@/components/chat/ConversationView";

interface ConversationPageProps {
  params: Promise<{
    conversationId: string;
  }>;
}

export default async function ConversationPage({
  params,
}: ConversationPageProps) {
  const { conversationId } =
    await params;

  return (
    <ConversationView
      conversationId={conversationId}
    />
  );
}