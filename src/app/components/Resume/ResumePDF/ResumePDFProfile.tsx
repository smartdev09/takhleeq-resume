import { View } from "@react-pdf/renderer";
import {
  ResumePDFIcon,
  type IconType,
} from "components/Resume/ResumePDF/common/ResumePDFIcon";
import { styles, spacing } from "components/Resume/ResumePDF/styles";
import {
  ResumePDFLink,
  ResumePDFSection,
  ResumePDFText,
} from "components/Resume/ResumePDF/common";
import type { ResumeProfile } from "lib/redux/types";

function ensureUrl(value: string): string {
  if (!value) return "";
  return value.startsWith("http") ? value : `https://${value}`;
}

export const contactItemsFromProfile = (profile: ResumeProfile) => {
  const { email, phone, linkedin, website, github, city, state, country } = profile;
  const cityState = [city, state].filter(Boolean).join(", ").trim();
  const displayLocation = [cityState, country].filter(Boolean).join(" \u2022 ");
  const items: { key: string; value: string; iconType: IconType; href?: string }[] = [];
  if (email) items.push({ key: "email", value: email, iconType: "email", href: `mailto:${email}` });
  if (phone) items.push({ key: "phone", value: phone, iconType: "phone", href: `tel:${phone.replace(/[^\d+]/g, "")}` });
  if (displayLocation) items.push({ key: "location", value: displayLocation, iconType: "location" });
  if (linkedin) items.push({ key: "linkedin", value: linkedin, iconType: "url_linkedin", href: ensureUrl(linkedin) });
  if (website) items.push({ key: "website", value: website, iconType: "url", href: ensureUrl(website) });
  if (github) items.push({ key: "github", value: github, iconType: "url_github", href: ensureUrl(github) });
  return items;
};

export const ResumePDFContactRow = ({
  profile,
  themeColor,
  isPDF,
}: {
  profile: ResumeProfile;
  themeColor: string;
  isPDF: boolean;
}) => {
  const contactItems = contactItemsFromProfile(profile);
  if (contactItems.length === 0) return null;
  return (
    <ResumePDFSection style={{ marginTop: spacing["4"] }}>
      <View
        style={{
          ...styles.flexRowBetween,
          flexWrap: "wrap",
        }}
      >
        {contactItems.map(({ key, value, iconType, href }) => {
          const Wrapper = href
            ? ({ children }: { children: React.ReactNode }) => (
                <ResumePDFLink src={href} isPDF={isPDF}>
                  {children}
                </ResumePDFLink>
              )
            : ({ children }: { children: React.ReactNode }) => <>{children}</>;

          return (
            <View
              key={key}
              style={{
                ...styles.flexRow,
                alignItems: "center",
                gap: spacing["1"],
              }}
            >
              <ResumePDFIcon type={iconType} isPDF={isPDF} />
              <Wrapper>
                <ResumePDFText>{value}</ResumePDFText>
              </Wrapper>
            </View>
          );
        })}
      </View>
    </ResumePDFSection>
  );
};

export const ResumePDFProfile = ({
  profile,
  themeColor,
  isPDF,
  showSummary = true,
  showContactRow = true,
}: {
  profile: ResumeProfile;
  themeColor: string;
  isPDF: boolean;
  showSummary?: boolean;
  showContactRow?: boolean;
}) => {
  const {
    firstName,
    lastName,
    title,
    summary,
  } = profile;
  const displayName = [firstName, lastName].filter(Boolean).join(" ").trim() || " ";
  const contactItems = contactItemsFromProfile(profile);

  return (
    <ResumePDFSection style={{ marginTop: spacing["4"] }}>
      <ResumePDFText
        bold={true}
        themeColor={themeColor}
        style={{ fontSize: "20pt" }}
      >
        {displayName}
      </ResumePDFText>
      {title && (
        <ResumePDFText style={{ marginTop: spacing["0.5"] }}>{title}</ResumePDFText>
      )}
      {showSummary && summary && <ResumePDFText>{summary}</ResumePDFText>}
      {showContactRow && (
        <View
          style={{
            ...styles.flexRowBetween,
            flexWrap: "wrap",
            marginTop: spacing["0.5"],
          }}
        >
          {contactItems.map(({ key, value, iconType, href }) => {
            const Wrapper = href
              ? ({ children }: { children: React.ReactNode }) => (
                  <ResumePDFLink src={href} isPDF={isPDF}>
                    {children}
                  </ResumePDFLink>
                )
              : ({ children }: { children: React.ReactNode }) => <>{children}</>;

            return (
              <View
                key={key}
                style={{
                  ...styles.flexRow,
                  alignItems: "center",
                  gap: spacing["1"],
                }}
              >
                <ResumePDFIcon type={iconType} isPDF={isPDF} />
                <Wrapper>
                  <ResumePDFText>{value}</ResumePDFText>
                </Wrapper>
              </View>
            );
          })}
        </View>
      )}
    </ResumePDFSection>
  );
};
