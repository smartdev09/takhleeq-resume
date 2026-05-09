import { View } from "@react-pdf/renderer";
import { ResumePDFSection, ResumePDFText } from "components/Resume/ResumePDF/common";
import { styles, spacing } from "components/Resume/ResumePDF/styles";
import type { ResumeAward } from "lib/redux/types";

export const ResumePDFAward = ({
  heading,
  awards,
  themeColor,
}: {
  heading: string;
  awards: ResumeAward[];
  themeColor: string;
}) => {
  const filtered = awards.filter((a) => a.title || a.description || a.date);
  if (filtered.length === 0) return null;

  return (
    <ResumePDFSection themeColor={themeColor} heading={heading}>
      {filtered.map(({ title, description, date }, idx) => (
        <View key={idx} style={idx !== 0 ? { marginTop: spacing["2"] } : {}}>
          <ResumePDFText bold={true}>{title}</ResumePDFText>
          <View
            style={{
              ...styles.flexRowBetween,
              marginTop: spacing["1"],
            }}
          >
            {description && (
              <ResumePDFText style={{ flex: 1 }}>{description}</ResumePDFText>
            )}
            <ResumePDFText>{date}</ResumePDFText>
          </View>
        </View>
      ))}
    </ResumePDFSection>
  );
};
