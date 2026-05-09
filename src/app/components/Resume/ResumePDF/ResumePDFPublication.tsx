import { View } from "@react-pdf/renderer";
import {
  ResumePDFSection,
  ResumePDFText,
  ResumePDFLink,
} from "components/Resume/ResumePDF/common";
import { spacing } from "components/Resume/ResumePDF/styles";
import type { ResumePublication } from "lib/redux/types";

export const ResumePDFPublication = ({
  heading,
  publications,
  themeColor,
  isPDF,
}: {
  heading: string;
  publications: ResumePublication[];
  themeColor: string;
  isPDF: boolean;
}) => {
  const filtered = publications.filter(
    (p) => p.title || p.authors || p.venue || p.date
  );
  if (filtered.length === 0) return null;

  return (
    <ResumePDFSection themeColor={themeColor} heading={heading}>
      {filtered.map(({ title, authors, venue, date, link }, idx) => (
        <View key={idx} style={idx !== 0 ? { marginTop: spacing["2"] } : {}}>
          <ResumePDFText bold={true}>{title}</ResumePDFText>
          <View style={{ marginTop: spacing["1"] }}>
            <ResumePDFText>{authors}</ResumePDFText>
            <ResumePDFText>{venue}</ResumePDFText>
            <ResumePDFText>{date}</ResumePDFText>
          </View>
          {link && (
            <View style={{ marginTop: spacing["0.5"] }}>
              <ResumePDFLink
                src={link.startsWith("http") ? link : `https://${link}`}
                isPDF={isPDF}
              >
                <ResumePDFText style={{ textDecoration: "underline" }}>
                  {link}
                </ResumePDFText>
              </ResumePDFLink>
            </View>
          )}
        </View>
      ))}
    </ResumePDFSection>
  );
};
