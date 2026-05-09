import { View } from "@react-pdf/renderer";
import { ResumePDFSection, ResumePDFText } from "components/Resume/ResumePDF/common";
import { spacing } from "components/Resume/ResumePDF/styles";

export const ResumePDFSummary = ({
  summary,
}: {
  summary: string;
}) => {
  if (!summary?.trim()) return null;
  return (
    <ResumePDFSection style={{ marginTop: spacing["4"] }}>
      <ResumePDFText>{summary}</ResumePDFText>
    </ResumePDFSection>
  );
};
