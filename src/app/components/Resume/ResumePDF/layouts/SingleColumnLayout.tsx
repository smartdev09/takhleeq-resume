import { View } from "@react-pdf/renderer";
import { styles } from "components/Resume/ResumePDF/styles";
import type { ShowForm } from "lib/redux/settingsSlice";

export const SingleColumnLayout = ({
  profileBlock,
  sectionBlocks,
  marginH = "1.25in",
  marginV = "0.5in",
}: {
  profileBlock: React.ReactNode;
  sectionBlocks: { form: ShowForm; node: React.ReactNode }[];
  marginH?: string;
  marginV?: string;
}) => (
  <View
    style={{
      ...styles.flexCol,
      padding: `${marginV} ${marginH}`,
    }}
  >
    {profileBlock}
    {sectionBlocks.map(({ form, node }) => (
      <View key={form}>{node}</View>
    ))}
  </View>
);
