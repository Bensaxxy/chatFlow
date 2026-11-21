import ChatFlowLoader from "@/components/shared/ChatFlowLoader";

interface FullPageLoaderProps {
  message?: string;
}

export default function FullPageLoader({
  message = "Loading...",
}: FullPageLoaderProps) {
  return <ChatFlowLoader message={message} fullScreen />;
}
