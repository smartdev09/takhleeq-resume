import { Page, View, Document } from "@react-pdf/renderer";
import { styles, spacing } from "components/Resume/ResumePDF/styles";
import { ResumePDFProfile, ResumePDFContactRow } from "components/Resume/ResumePDF/ResumePDFProfile";
import { ResumePDFSummary } from "components/Resume/ResumePDF/ResumePDFSummary";
import { ResumePDFWorkExperience } from "components/Resume/ResumePDF/ResumePDFWorkExperience";
import { ResumePDFEducation } from "components/Resume/ResumePDF/ResumePDFEducation";
import { ResumePDFProject } from "components/Resume/ResumePDF/ResumePDFProject";
import { ResumePDFSkills } from "components/Resume/ResumePDF/ResumePDFSkills";
import { ResumePDFCertification } from "components/Resume/ResumePDF/ResumePDFCertification";
import { ResumePDFAward } from "components/Resume/ResumePDF/ResumePDFAward";
import { ResumePDFPublication } from "components/Resume/ResumePDF/ResumePDFPublication";
import { ResumePDFVolunteering } from "components/Resume/ResumePDF/ResumePDFVolunteering";
import { ResumePDFInterests } from "components/Resume/ResumePDF/ResumePDFInterests";
import { ResumePDFCustom } from "components/Resume/ResumePDF/ResumePDFCustom";
import { SingleColumnLayout } from "components/Resume/ResumePDF/layouts/SingleColumnLayout";
import { TwoColumnLayout } from "components/Resume/ResumePDF/layouts/TwoColumnLayout";
import { MixedColumnLayout } from "components/Resume/ResumePDF/layouts/MixedColumnLayout";
import { ResumePDFSettingsProvider } from "components/Resume/ResumePDF/common";
import { DEFAULT_FONT_COLOR } from "lib/redux/settingsSlice";
import type { Settings, ShowForm } from "lib/redux/settingsSlice";
import type { Resume } from "lib/redux/types";
import { SuppressResumePDFErrorMessage } from "components/Resume/ResumePDF/common/SuppressResumePDFErrorMessage";

/**
 * Note: ResumePDF is supposed to be rendered inside PDFViewer. However,
 * PDFViewer is rendered too slow and has noticeable delay as you enter
 * the resume form, so we render it without PDFViewer to make it render
 * instantly. There are 2 drawbacks with this approach:
 * 1. Not everything works out of box if not rendered inside PDFViewer,
 *    e.g. svg doesn't work, so it takes in a isPDF flag that maps react
 *    pdf element to the correct dom element.
 * 2. It throws a lot of errors in console log, e.g. "<VIEW /> is using incorrect
 *    casing. Use PascalCase for React components, or lowercase for HTML elements."
 *    in development, causing a lot of noises. We can possibly workaround this by
 *    mapping every react pdf element to a dom element, but for now, we simply
 *    suppress these messages in <SuppressResumePDFErrorMessage />.
 *    https://github.com/diegomura/react-pdf/issues/239#issuecomment-487255027
 */
export const ResumePDF = ({
  resume,
  settings,
  isPDF = false,
}: {
  resume: Resume;
  settings: Settings;
  isPDF?: boolean;
}) => {
  const {
    profile,
    workExperiences,
    educations,
    projects,
    skills,
    certifications,
    awards,
    publications,
    volunteering,
    interests,
    custom,
  } = resume;
  const displayName =
    [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim() ||
    "Resume";
  const {
    fontFamily,
    fontSize,
    documentSize,
    formToHeading,
    formToShow,
    formsOrder,
    showBulletPoints,
    templateId,
    sidebarFormIds,
    bulletStyle,
    lineHeight,
    marginLeftRight,
    marginTopBottom,
    skillsLayout,
    interestsDisplayMode,
  } = settings;
  const themeColor = settings.themeColor || DEFAULT_FONT_COLOR;

  // Convert margin values (inches) to CSS strings for layout components
  const marginH = `${marginLeftRight}in`;
  const marginV = `${marginTopBottom}in`;

  const showFormsOrder = formsOrder.filter((form) => formToShow[form]);
  const sidebarForms = showFormsOrder.filter((f) => sidebarFormIds.includes(f));
  const mainForms = showFormsOrder.filter((f) => !sidebarFormIds.includes(f));

  const formTypeToComponent: { [type in ShowForm]: () => React.ReactElement } = {
    workExperiences: () => (
      <ResumePDFWorkExperience
        heading={formToHeading["workExperiences"]}
        workExperiences={workExperiences}
        themeColor={themeColor}
      />
    ),
    educations: () => (
      <ResumePDFEducation
        heading={formToHeading["educations"]}
        educations={educations}
        themeColor={themeColor}
        showBulletPoints={showBulletPoints["educations"]}
      />
    ),
    projects: () => (
      <ResumePDFProject
        heading={formToHeading["projects"]}
        projects={projects}
        themeColor={themeColor}
      />
    ),
    skills: () => (
      <ResumePDFSkills
        heading={formToHeading["skills"]}
        skills={skills}
        themeColor={themeColor}
        showBulletPoints={showBulletPoints["skills"]}
        skillsLayout={skillsLayout}
      />
    ),
    certifications: () => (
      <ResumePDFCertification
        heading={formToHeading["certifications"]}
        certifications={certifications}
        themeColor={themeColor}
        isPDF={isPDF}
      />
    ),
    awards: () => (
      <ResumePDFAward
        heading={formToHeading["awards"]}
        awards={awards}
        themeColor={themeColor}
      />
    ),
    publications: () => (
      <ResumePDFPublication
        heading={formToHeading["publications"]}
        publications={publications}
        themeColor={themeColor}
        isPDF={isPDF}
      />
    ),
    volunteering: () => (
      <ResumePDFVolunteering
        heading={formToHeading["volunteering"]}
        volunteering={volunteering}
        themeColor={themeColor}
        showBulletPoints={showBulletPoints["volunteering"]}
      />
    ),
    interests: () => (
      <ResumePDFInterests
        heading={formToHeading["interests"]}
        interests={interests}
        themeColor={themeColor}
        displayMode={interestsDisplayMode}
      />
    ),
    custom: () => (
      <ResumePDFCustom
        heading={formToHeading["custom"]}
        custom={custom}
        themeColor={themeColor}
        showBulletPoints={showBulletPoints["custom"]}
      />
    ),
  };

  const sectionBlocks = showFormsOrder.map((form) => ({
    form,
    node: formTypeToComponent[form](),
  }));

  const renderSectionBlocks = (forms: ShowForm[]) =>
    forms.map((form) => {
      const Component = formTypeToComponent[form];
      return (
        <View key={form}>
          <Component />
        </View>
      );
    });

  const profileBlockFull = (
    <ResumePDFProfile
      profile={profile}
      themeColor={themeColor}
      isPDF={isPDF}
    />
  );
  const profileBlockNoSummary = (
    <ResumePDFProfile
      profile={profile}
      themeColor={themeColor}
      isPDF={isPDF}
      showSummary={false}
    />
  );
  const profileBlockHeaderOnly = (
    <ResumePDFProfile
      profile={profile}
      themeColor={themeColor}
      isPDF={isPDF}
      showContactRow={false}
    />
  );
  const contactRowBlock = (
    <ResumePDFContactRow profile={profile} themeColor={themeColor} isPDF={isPDF} />
  );
  const summaryBlock = <ResumePDFSummary summary={profile.summary} />;

  const singleColumnContent = (
    <SingleColumnLayout
      profileBlock={profileBlockFull}
      sectionBlocks={sectionBlocks}
      marginH={marginH}
      marginV={marginV}
    />
  );

  const twoColumnContent = (
    <TwoColumnLayout
      sidebarContent={
        <>
          {profileBlockNoSummary}
          {renderSectionBlocks(sidebarForms)}
        </>
      }
      mainContent={
        <>
          {summaryBlock}
          {renderSectionBlocks(mainForms)}
        </>
      }
      marginH={marginH}
      marginV={marginV}
    />
  );

  const mixedColumnContent = (
    <MixedColumnLayout
      fullWidthHeader={profileBlockHeaderOnly}
      sidebarContent={
        <>
          {contactRowBlock}
          {renderSectionBlocks(sidebarForms)}
        </>
      }
      mainContent={renderSectionBlocks(mainForms)}
      marginH={marginH}
      marginV={marginV}
    />
  );

  const layoutContent =
    templateId === "two-column"
      ? twoColumnContent
      : templateId === "mixed"
        ? mixedColumnContent
        : singleColumnContent;

  return (
    <ResumePDFSettingsProvider bulletStyle={bulletStyle} lineHeight={lineHeight}>
      <Document title={`${displayName} Resume`} author={displayName} producer={"takhleeq"}>
        <Page
          size={documentSize === "A4" ? "A4" : "LETTER"}
          style={{
            ...styles.flexCol,
            color: DEFAULT_FONT_COLOR,
            fontFamily,
            fontSize: fontSize + "pt",
          }}
        >
          {Boolean(settings.themeColor) && (
            <View
              style={{
                width: spacing["full"],
                height: spacing[3.5],
                backgroundColor: themeColor,
              }}
            />
          )}
          {layoutContent}
        </Page>
      </Document>
      <SuppressResumePDFErrorMessage />
    </ResumePDFSettingsProvider>
  );
};
