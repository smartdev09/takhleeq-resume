import { View } from "@react-pdf/renderer";
import {
  ResumePDFSection,
  ResumePDFBulletList,
  ResumePDFText,
} from "components/Resume/ResumePDF/common";
import { styles, spacing } from "components/Resume/ResumePDF/styles";
import type { ResumeVolunteering } from "lib/redux/types";

export const ResumePDFVolunteering = ({
  heading,
  volunteering,
  themeColor,
  showBulletPoints,
}: {
  heading: string;
  volunteering: ResumeVolunteering[];
  themeColor: string;
  showBulletPoints: boolean;
}) => {
  const filtered = volunteering.filter(
    (v) => v.organization || v.role || v.date || (v.descriptions?.length && v.descriptions.some(Boolean))
  );
  if (filtered.length === 0) return null;

  return (
    <ResumePDFSection themeColor={themeColor} heading={heading}>
      {filtered.map(
        ({ organization, role, date, descriptions = [] }, idx) => {
          const showDescriptions = descriptions.join("") !== "";
          return (
            <View
              key={idx}
              style={idx !== 0 ? { marginTop: spacing["2"] } : {}}
            >
              <ResumePDFText bold={true}>{organization}</ResumePDFText>
              <View
                style={{
                  ...styles.flexRowBetween,
                  marginTop: spacing["1"],
                }}
              >
                <ResumePDFText>{role}</ResumePDFText>
                <ResumePDFText>{date}</ResumePDFText>
              </View>
              {showDescriptions && (
                <View style={{ ...styles.flexCol, marginTop: spacing["1.5"] }}>
                  <ResumePDFBulletList
                    items={descriptions}
                    showBulletPoints={showBulletPoints}
                  />
                </View>
              )}
            </View>
          );
        }
      )}
    </ResumePDFSection>
  );
};
