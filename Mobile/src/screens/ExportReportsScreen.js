import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Share,
} from 'react-native';
import { Card, Button, ActivityIndicator } from 'react-native-paper';
import { useLanguage } from '../i18n/LanguageContext';
import { useNavigation } from '@react-navigation/native';
import { exportReportAPI } from '../services/api';

const ExportReportsScreen = () => {
  const { t } = useLanguage();
  const navigation = useNavigation();
  const [generating, setGenerating] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState(30);

  const reportTypes = [
    {
      type: 'medicine_list',
      icon: '💊',
      color: '#0d9488',
      bgColor: '#f0fdfa',
    },
    {
      type: 'dose_history',
      icon: '🕐',
      color: '#3b82f6',
      bgColor: '#eff6ff',
    },
    {
      type: 'adherence_report',
      icon: '📊',
      color: '#8b5cf6',
      bgColor: '#f5f3ff',
    },
    {
      type: 'full_report',
      icon: '📋',
      color: '#f59e0b',
      bgColor: '#fffbeb',
    },
  ];

  const periodOptions = [
    { value: 7, labelKey: 'exportReports.last7Days' },
    { value: 14, labelKey: 'exportReports.last14Days' },
    { value: 30, labelKey: 'exportReports.last30Days' },
    { value: 60, labelKey: 'exportReports.last60Days' },
    { value: 90, labelKey: 'exportReports.last90Days' },
  ];

  const handleDownload = async (reportType) => {
    setGenerating(reportType);
    try {
      const response = await exportReportAPI.downloadPDF(reportType, selectedPeriod);
      const blob = await response.blob();

      // On mobile, we can share the file or save it
      if (Platform.OS === 'web') {
        // Web fallback
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `saluslogica_${reportType}_${new Date().toISOString().slice(0, 10)}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // React Native: convert blob to base64 and share
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = reader.result.split(',')[1];
          try {
            await Share.share({
              title: `SalusLogica ${t(`exportReports.${reportType}`)} Report`,
              message: t('exportReports.shareMessage'),
              url: `data:application/pdf;base64,${base64}`,
            });
          } catch (shareError) {
            if (shareError.message !== 'User did not share') {
              console.error('Share error:', shareError);
            }
          }
        };
        reader.readAsDataURL(blob);
      }

      Alert.alert(t('common.success'), t('exportReports.downloadSuccess'));
    } catch (error) {
      console.error('PDF download error:', error);
      Alert.alert(t('common.error'), error.message || t('exportReports.downloadError'));
    } finally {
      setGenerating(null);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>← {t('common.cancel')}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{t('exportReports.title')}</Text>
          <Text style={styles.subtitle}>{t('exportReports.subtitle')}</Text>
        </View>

        {/* Period Selector */}
        <Card style={styles.periodCard}>
          <View style={styles.periodContent}>
            <Text style={styles.sectionTitle}>{t('exportReports.timePeriod')}</Text>
            <View style={styles.periodRow}>
              {periodOptions.map((period) => (
                <TouchableOpacity
                  key={period.value}
                  style={[
                    styles.periodChip,
                    selectedPeriod === period.value && styles.periodChipActive,
                  ]}
                  onPress={() => setSelectedPeriod(period.value)}
                >
                  <Text
                    style={[
                      styles.periodChipText,
                      selectedPeriod === period.value && styles.periodChipTextActive,
                    ]}
                  >
                    {t(period.labelKey)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Card>

        {/* Report Cards */}
        <Text style={styles.sectionTitle}>{t('exportReports.availableReports')}</Text>
        {reportTypes.map((report) => (
          <Card key={report.type} style={[styles.reportCard, { borderLeftColor: report.color }]}>
            <View style={styles.reportContent}>
              <View style={[styles.iconCircle, { backgroundColor: report.bgColor }]}>
                <Text style={styles.reportIcon}>{report.icon}</Text>
              </View>
              <View style={styles.reportInfo}>
                <Text style={styles.reportName}>
                  {t(`exportReports.${report.type}`)}
                </Text>
                <Text style={styles.reportDesc}>
                  {t(`exportReports.${report.type}Desc`)}
                </Text>
              </View>
              <Button
                mode="contained"
                onPress={() => handleDownload(report.type)}
                loading={generating === report.type}
                disabled={generating !== null}
                style={[styles.downloadBtn, { backgroundColor: report.color }]}
                labelStyle={styles.downloadBtnText}
                compact
              >
                {generating === report.type
                  ? t('exportReports.generating')
                  : t('exportReports.download')}
              </Button>
            </View>
          </Card>
        ))}

        {/* Info Note */}
        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoText}>{t('exportReports.infoNote')}</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  backButton: {
    marginBottom: 12,
  },
  backText: {
    color: '#0d9488',
    fontSize: 14,
    fontWeight: '500',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  periodCard: {
    marginBottom: 20,
    borderRadius: 12,
  },
  periodContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  periodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  periodChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  periodChipActive: {
    backgroundColor: '#0d9488',
    borderColor: '#0d9488',
  },
  periodChipText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  periodChipTextActive: {
    color: '#ffffff',
  },
  reportCard: {
    marginBottom: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
  },
  reportContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportIcon: {
    fontSize: 22,
  },
  reportInfo: {
    flex: 1,
  },
  reportName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  reportDesc: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 16,
  },
  downloadBtn: {
    borderRadius: 8,
  },
  downloadBtnText: {
    fontSize: 12,
    color: '#ffffff',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    gap: 10,
  },
  infoIcon: {
    fontSize: 16,
    marginTop: 1,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 18,
  },
});

export default ExportReportsScreen;
