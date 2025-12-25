import { Document, Page, Text, View, StyleSheet, Image, Link, Font } from '@react-pdf/renderer';
import React from 'react';

// Register fonts (using standard fonts for now to avoid loading issues)
// In production you might want to load custom fonts
// Font.register({ family: 'Inter', src: '/fonts/Inter-Regular.ttf' });

const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
    padding: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#374151',
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
    paddingLeft: 8,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  statCard: {
    flex: 1,
    padding: 15,
    backgroundColor: '#f9fafb',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minWidth: '30%',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  heatmapImage: {
    width: '100%',
    height: 300,
    objectFit: 'contain',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 10,
  },
  table: {
    flexDirection: 'column',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    padding: 8,
    alignItems: 'center',
  },
  tableHeader: {
    backgroundColor: '#f3f4f6',
    fontWeight: 'bold',
  },
  tableCell: {
    flex: 1,
    fontSize: 10,
    color: '#374151',
  },
  link: {
    color: '#2563eb',
    textDecoration: 'none',
  }, 
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
  }
});

// Define interfaces for props
interface ReportStats {
  totalClicks: number;
  uniqueSessions: number;
  topPages: { path: string; visits: number }[];
  deviceStats: { device: string; count: number }[];
}

interface FullReportProps {
  siteUrl: string;
  dateRange: string;
  stats: ReportStats;
  heatmapImages?: Record<string, string>; // path -> base64 image
}

export const FullReportDocument: React.FC<FullReportProps> = ({ 
  siteUrl, 
  dateRange, 
  stats,
  heatmapImages = {} 
}) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text>Simple PDF Test</Text>
          <Text>Site: {siteUrl}</Text> 
        </View>
      </Page>
    </Document>

  );
};
