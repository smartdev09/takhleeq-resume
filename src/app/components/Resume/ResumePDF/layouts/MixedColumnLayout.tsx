import { View } from "@react-pdf/renderer";
import { styles, spacing } from "components/Resume/ResumePDF/styles";

const SIDEBAR_WIDTH = "30%";

export const MixedColumnLayout = ({
  fullWidthHeader,
  sidebarContent,
  mainContent,
  marginH = "1.25in",
  marginV = "0.5in",
}: {
  fullWidthHeader: React.ReactNode;
  sidebarContent: React.ReactNode;
  mainContent: React.ReactNode;
  marginH?: string;
  marginV?: string;
}) => (
  <View style={{ ...styles.flexCol }}>
    <View
      style={{
        ...styles.flexCol,
        padding: `${marginV} ${marginH} 0`,
      }}
    >
      {fullWidthHeader}
    </View>
    <View
      style={{
        ...styles.flexRow,
        padding: `${spacing[4]} ${marginH} 0`,
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
  </View>
);
