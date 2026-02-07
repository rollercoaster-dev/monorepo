import { ref } from "vue";

export function useCopyVar() {
  const copiedVar = ref("");

  function copyVar(varName: string): void {
    navigator.clipboard.writeText(`var(${varName})`).then(
      () => {
        copiedVar.value = varName;
        setTimeout(() => {
          copiedVar.value = "";
        }, 1500);
      },
      () => {
        console.warn(
          `[Story] Clipboard write failed for ${varName}. Ensure HTTPS or localhost.`,
        );
      },
    );
  }

  return { copiedVar, copyVar };
}
