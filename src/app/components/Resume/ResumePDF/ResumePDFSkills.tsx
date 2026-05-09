import { View } from "@react-pdf/renderer";
import {
  ResumePDFSection,
  ResumePDFBulletList,
  ResumeFeaturedSkill,
  ResumePDFText,
} from "components/Resume/ResumePDF/common";
import { styles, spacing } from "components/Resume/ResumePDF/styles";
import type { ResumeSkills } from "lib/redux/types";
import type { SkillsLayout } from "lib/redux/settingsSlice";

export const ResumePDFSkills = ({
  heading,
  skills,
  themeColor,
  showBulletPoints,
  skillsLayout = "categoryInline",
}: {
  heading: string;
  skills: ResumeSkills;
  themeColor: string;
  showBulletPoints: boolean;
  skillsLayout?: SkillsLayout;
}) => {
  const { descriptions, featuredSkills } = skills;
  const featuredSkillsWithText = featuredSkills.filter((item) => item.skill);

  if (skillsLayout === "commaSeparated") {
    const allSkills = [
      ...featuredSkillsWithText.map((s) => s.skill),
      ...descriptions,
    ].filter(Boolean);
    if (allSkills.length === 0) return null;
    return (
      <ResumePDFSection themeColor={themeColor} heading={heading}>
        <ResumePDFText>{allSkills.join(", ")}</ResumePDFText>
      </ResumePDFSection>
    );
  }

  if (skillsLayout === "categoryColumns") {
    return (
      <ResumePDFSection themeColor={themeColor} heading={heading}>
        {featuredSkillsWithText.length > 0 && (
          <View
            style={{
              ...styles.flexRow,
              flexWrap: "wrap",
              gap: spacing["2"],
              marginTop: spacing["0.5"],
            }}
          >
            {featuredSkillsWithText.map((featuredSkill, idx) => (
              <ResumeFeaturedSkill
                key={idx}
                skill={featuredSkill.skill}
                rating={featuredSkill.rating}
                themeColor={themeColor}
              />
            ))}
          </View>
        )}
        {descriptions.length > 0 && (
          <View style={{ ...styles.flexCol }}>
            <ResumePDFBulletList
              items={descriptions}
              showBulletPoints={showBulletPoints}
            />
          </View>
        )}
      </ResumePDFSection>
    );
  }

  // Default: categoryInline — featured skills in 3×2 grid + descriptions
  const featuredSkillsPair = [
    [featuredSkillsWithText[0], featuredSkillsWithText[3]],
    [featuredSkillsWithText[1], featuredSkillsWithText[4]],
    [featuredSkillsWithText[2], featuredSkillsWithText[5]],
  ];

  return (
    <ResumePDFSection themeColor={themeColor} heading={heading}>
      {featuredSkillsWithText.length > 0 && (
        <View style={{ ...styles.flexRowBetween, marginTop: spacing["0.5"] }}>
          {featuredSkillsPair.map((pair, idx) => (
            <View
              key={idx}
              style={{
                ...styles.flexCol,
              }}
            >
              {pair.map((featuredSkill, idx) => {
                if (!featuredSkill) return null;
                return (
                  <ResumeFeaturedSkill
                    key={idx}
                    skill={featuredSkill.skill}
                    rating={featuredSkill.rating}
                    themeColor={themeColor}
                    style={{
                      justifyContent: "flex-end",
                    }}
                  />
                );
              })}
            </View>
          ))}
        </View>
      )}
      <View style={{ ...styles.flexCol }}>
        <ResumePDFBulletList
          items={descriptions}
          showBulletPoints={showBulletPoints}
        />
      </View>
    </ResumePDFSection>
  );
};
