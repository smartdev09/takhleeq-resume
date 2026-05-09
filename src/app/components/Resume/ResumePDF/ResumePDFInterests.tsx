import { View } from "@react-pdf/renderer";
import {
  ResumePDFSection,
  ResumePDFText,
  ResumePDFBulletList,
} from "components/Resume/ResumePDF/common";
import { spacing } from "components/Resume/ResumePDF/styles";
import type { ResumeInterest } from "lib/redux/types";

export const ResumePDFInterests = ({
  heading,
  interests,
  themeColor,
  displayMode = "comma",
}: {
  heading: string;
  interests: ResumeInterest;
  themeColor: string;
  displayMode?: "comma" | "bullets" | "tags";
}) => {
  const comma = (interests.commaSeparated ?? "").trim();
  const bullets = (interests.bullets ?? []).filter(Boolean);
  const tags = (interests.tags ?? []).filter(Boolean);

  const hasContent = comma || bullets.length > 0 || tags.length > 0;
  if (!hasContent) return null;

  if (displayMode === "bullets") {
    const items =
      bullets.length > 0
        ? bullets
        : comma
          ? comma.split(",").map((s) => s.trim()).filter(Boolean)
          : tags;
    if (items.length === 0) return null;
    return (
      <ResumePDFSection themeColor={themeColor} heading={heading}>
        <ResumePDFBulletList items={items} showBulletPoints={true} />
      </ResumePDFSection>
    );
  }

  if (displayMode === "tags") {
    const items =
      tags.length > 0
        ? tags
        : comma
          ? comma.split(",").map((s) => s.trim()).filter(Boolean)
          : bullets;
    if (items.length === 0) return null;
    return (
      <ResumePDFSection themeColor={themeColor} heading={heading}>
        <View
          style={{
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            gap: spacing["1.5"],
          }}
        >
          {items.map((tag, idx) => (
            <ResumePDFText
              key={idx}
              style={{
                backgroundColor: "#f3f4f6",
                borderRadius: "3pt",
                paddingHorizontal: spacing["2"],
                paddingVertical: spacing["0.5"],
              }}
            >
              {tag}
            </ResumePDFText>
          ))}
        </View>
      </ResumePDFSection>
    );
  }

  // Default: comma-separated
  const text = comma || bullets.join(", ") || tags.join(", ");
  if (!text) return null;

  return (
    <ResumePDFSection themeColor={themeColor} heading={heading}>
      <ResumePDFText>{text}</ResumePDFText>
    </ResumePDFSection>
  );
};
