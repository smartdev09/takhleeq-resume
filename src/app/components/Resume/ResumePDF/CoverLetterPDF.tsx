import { Document, Page, Text, View } from "@react-pdf/renderer";
import { spacing } from "components/Resume/ResumePDF/styles";
import type { ResumeProfile } from "lib/redux/types";

interface CoverLetterPDFProps {
  content: string;
  profile: ResumeProfile;
  fontFamily?: string;
  fontSize?: string;
}

const BASE_FONT_SIZE = 11;

export function CoverLetterPDF({
  content,
  profile,
  fontFamily = "Helvetica",
  fontSize,
}: CoverLetterPDFProps) {
  const parsedSize = fontSize ? parseFloat(fontSize) : BASE_FONT_SIZE;
  const bodyFontSize = isNaN(parsedSize) ? BASE_FONT_SIZE : parsedSize;

  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const contactParts = [
    profile.email,
    profile.phone,
    [profile.city, profile.state].filter(Boolean).join(", "),
  ].filter(Boolean);

  const paragraphs = content
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <Document>
      <Page
        size="LETTER"
        style={{
          fontFamily,
          fontSize: `${bodyFontSize}pt`,
          color: "#1a1a1a",
          paddingTop: spacing[12],
          paddingBottom: spacing[12],
          paddingLeft: spacing[14],
          paddingRight: spacing[14],
          lineHeight: 1.5,
        }}
      >
        {/* Header: Name */}
        <View style={{ marginBottom: spacing[2] }}>
          <Text
            style={{
              fontSize: `${bodyFontSize + 6}pt`,
              fontWeight: "bold",
              color: "#111827",
            }}
          >
            {`${profile.firstName} ${profile.lastName}`.trim()}
          </Text>
          {profile.title ? (
            <Text
              style={{
                fontSize: `${bodyFontSize - 1}pt`,
                color: "#4b5563",
                marginTop: spacing[0.5],
              }}
            >
              {profile.title}
            </Text>
          ) : null}
        </View>

        {/* Contact row */}
        {contactParts.length > 0 && (
          <Text
            style={{
              fontSize: `${bodyFontSize - 1}pt`,
              color: "#6b7280",
              marginBottom: spacing[4],
            }}
          >
            {contactParts.join("  ·  ")}
          </Text>
        )}

        {/* Divider */}
        <View
          style={{
            borderBottomWidth: 1,
            borderBottomColor: "#e5e7eb",
            marginBottom: spacing[5],
          }}
        />

        {/* Date */}
        <Text style={{ marginBottom: spacing[5], color: "#374151" }}>
          {today}
        </Text>

        {/* Body paragraphs */}
        {paragraphs.map((para, idx) => (
          <Text
            key={idx}
            style={{
              marginBottom: idx < paragraphs.length - 1 ? spacing[4] : 0,
              color: "#1f2937",
              lineHeight: 1.6,
            }}
          >
            {para}
          </Text>
        ))}
      </Page>
    </Document>
  );
}
