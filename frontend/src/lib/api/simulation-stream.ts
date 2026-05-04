import type {
  SimulationProgressEvent,
  SimulationResponse,
} from "@/lib/types";

export async function readSimulationProgressStream(
  response: Response,
  onEvent: (event: SimulationProgressEvent) => void,
): Promise<SimulationResponse> {
  const reader = response.body?.getReader();

  if (!reader) {
    throw new Error("진행 스트림을 열지 못했습니다.");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let lineNumber = 0;
  let streamResult: SimulationResponse | null = null;
  let streamError: string | null = null;

  function handleLine(rawLine: string) {
    lineNumber += 1;
    const line = rawLine.trim();

    if (!line) {
      return;
    }

    let event: SimulationProgressEvent;

    try {
      event = JSON.parse(line) as SimulationProgressEvent;
    } catch {
      const preview = line.length > 120 ? `${line.slice(0, 120)}...` : line;
      throw new Error(
        `진행 스트림 ${lineNumber}번째 줄을 JSON으로 해석하지 못했습니다: ${preview}`,
      );
    }

    onEvent(event);

    if (event.type === "result") {
      streamResult = event.response;
    }

    if (event.type === "error") {
      streamError = event.error;
    }
  }

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      handleLine(line);
    }

    if (done) {
      if (buffer.trim()) {
        handleLine(buffer);
      }
      break;
    }
  }

  if (streamError) {
    throw new Error(streamError);
  }

  if (!streamResult) {
    throw new Error("시뮬레이션 결과를 받지 못했습니다.");
  }

  return streamResult;
}
