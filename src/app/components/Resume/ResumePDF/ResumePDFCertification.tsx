import { View } from "@react-pdf/renderer";
import {
  ResumePDFSection,
  ResumePDFText,
  ResumePDFLink,
} from "components/Resume/ResumePDF/common";
import { styles, spacing } from "components/Resume/ResumePDF/styles";
import type { ResumeCertification } from "lib/redux/types";

export const ResumePDFCertification = ({
  heading,
  certifications,
  themeColor,
  isPDF,
}: {
  heading: string;
  certifications: ResumeCertification[];
  themeColor: string;
  isPDF: boolean;
}) => {
  const filtered = certifications.filter((c) => c.name || c.issuer || c.date);
  if (filtered.length === 0) return null;

  return (
    <ResumePDFSection themeColor={themeColor} heading={heading}>
      {filtered.map(({ name, issuer, date, url }, idx) => (
        <View key={idx} style={idx !== 0 ? { marginTop: spacing["2"] } : {}}>
          <ResumePDFText bold={true}>{name}</ResumePDFText>
          <View
            style={{
              ...styles.flexRowBetween,
              marginTop: spacing["1"],
            }}
          >
            <ResumePDFText>{issuer}</ResumePDFText>
            <ResumePDFText>{date}</ResumePDFText>
          </View>
          {url && (
            <View style={{ marginTop: spacing["0.5"] }}>
              <ResumePDFLink
                src={url.startsWith("http") ? url : `https://${url}`}
                isPDF={isPDF}
              >
                <ResumePDFText style={{ textDecoration: "underline" }}>
                  {url}
                </ResumePDFText>
              </ResumePDFLink>
            </View>
          )}
        </View>
      ))}
    </ResumePDFSection>
  );
};
