import { useCallback } from "react";

export function useSpecPDF() {
  const generatePDF = useCallback((specTitle: string) => {
    // Update document title for PDF filename
    const originalTitle = document.title;
    document.title = `${specTitle} - Specification`;

    // Trigger print dialog
    window.print();

    // Restore original title
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  }, []);

  return { generatePDF };
}
