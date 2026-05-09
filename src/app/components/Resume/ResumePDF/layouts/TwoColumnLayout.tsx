import { View } from "@react-pdf/renderer";
import { styles, spacing } from "components/Resume/ResumePDF/styles";
import type { ShowForm } from "lib/redux/settingsSlice";

const SIDEBAR_WIDTH = "30%";

export const TwoColumnLayout = ({
  sidebarContent,
  mainContent,
  marginH = "1.25in",
  marginV = "0.5in",
}: {
  sidebarContent: React.ReactNode;
  mainContent: React.ReactNode;
  marginH?: string;
  marginV?: string;
}) => (
  <View
    style={{
      ...styles.flexRow,
      padding: `${marginV} ${marginH}`,
      gap: spacing[8],
    }}
  >
    <View style={{ width: SIDEBAR_WIDTH, ...styles.flexCol }}>
      {sidebarContent}
    </View>
    <View style={{ flex: 1, ...styles.flexCol }}>
      {mainContent}
    </View>
  </View>
);
