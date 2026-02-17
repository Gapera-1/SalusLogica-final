import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

// Base Skeleton component with shimmer animation
export const Skeleton = ({ width = '100%', height = 20, style, rounded = 4 }) => {
  const { theme } = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor: theme.colors.surface,
          borderRadius: rounded,
          opacity,
        },
        style,
      ]}
    />
  );
};

// Skeleton for Medicine Card
export const SkeletonMedicineCard = () => {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.cardHeader}>
        <Skeleton width={60} height={60} rounded={30} />
        <View style={styles.cardHeaderText}>
          <Skeleton width="80%" height={20} />
          <Skeleton width="60%" height={16} style={{ marginTop: 8 }} />
        </View>
      </View>
      <View style={styles.cardBody}>
        <Skeleton width="100%" height={16} style={{ marginTop: 8 }} />
        <Skeleton width="90%" height={16} style={{ marginTop: 8 }} />
        <Skeleton width="70%" height={16} style={{ marginTop: 8 }} />
      </View>
      <View style={styles.cardFooter}>
        <Skeleton width={100} height={36} rounded={18} />
        <Skeleton width={100} height={36} rounded={18} />
      </View>
    </View>
  );
};

// Skeleton for Dashboard Stats
export const SkeletonStats = () => {
  const { theme } = useTheme();
  
  return (
    <View style={styles.statsContainer}>
      {[1, 2, 3, 4].map((_, index) => (
        <View key={index} style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
          <Skeleton width={40} height={40} rounded={20} />
          <Skeleton width="60%" height={20} style={{ marginTop: 12 }} />
          <Skeleton width="80%" height={16} style={{ marginTop: 8 }} />
        </View>
      ))}
    </View>
  );
};

// Skeleton for List Items
export const SkeletonListItem = () => {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.listItem, { backgroundColor: theme.colors.surface }]}>
      <Skeleton width={48} height={48} rounded={24} />
      <View style={styles.listItemText}>
        <Skeleton width="70%" height={18} />
        <Skeleton width="50%" height={14} style={{ marginTop: 8 }} />
      </View>
      <Skeleton width={24} height={24} rounded={12} />
    </View>
  );
};

// Skeleton for Profile Screen
export const SkeletonProfile = () => {
  const { theme } = useTheme();
  
  return (
    <View style={styles.profileContainer}>
      {/* Avatar */}
      <View style={styles.profileHeader}>
        <Skeleton width={120} height={120} rounded={60} />
        <Skeleton width="60%" height={24} style={{ marginTop: 16 }} />
        <Skeleton width="40%" height={16} style={{ marginTop: 8 }} />
      </View>

      {/* Profile Info Cards */}
      <View style={styles.profileCards}>
        {[1, 2, 3, 4].map((_, index) => (
          <View key={index} style={[styles.profileCard, { backgroundColor: theme.colors.surface }]}>
            <Skeleton width="40%" height={16} />
            <Skeleton width="80%" height={20} style={{ marginTop: 8 }} />
          </View>
        ))}
      </View>

      {/* Action Buttons */}
      <View style={styles.profileActions}>
        <Skeleton width="100%" height={48} rounded={8} />
        <Skeleton width="100%" height={48} rounded={8} style={{ marginTop: 12 }} />
      </View>
    </View>
  );
};

// Skeleton for Dashboard Screen
export const SkeletonDashboard = () => {
  return (
    <View style={styles.dashboardContainer}>
      {/* Header */}
      <View style={styles.dashboardHeader}>
        <Skeleton width="60%" height={28} />
        <Skeleton width="40%" height={16} style={{ marginTop: 8 }} />
      </View>

      {/* Stats Section */}
      <SkeletonStats />

      {/* Recent Medicines */}
      <View style={styles.recentSection}>
        <Skeleton width="50%" height={20} style={{ marginBottom: 16 }} />
        <SkeletonMedicineCard />
        <SkeletonMedicineCard />
      </View>
    </View>
  );
};

// Skeleton for Medicine List Screen
export const SkeletonMedicineList = () => {
  return (
    <View style={styles.listContainer}>
      <Skeleton width="100%" height={48} rounded={24} style={{ marginBottom: 16 }} />
      {[1, 2, 3, 4, 5].map((_, index) => (
        <View key={index} style={{ marginBottom: 12 }}>
          <SkeletonMedicineCard />
        </View>
      ))}
    </View>
  );
};

// Skeleton for Dose History Table
export const SkeletonTable = ({ rows = 5 }) => {
  const { theme } = useTheme();
  
  return (
    <View style={styles.tableContainer}>
      {/* Table Header */}
      <View style={[styles.tableHeader, { backgroundColor: theme.colors.surface }]}>
        <Skeleton width="30%" height={16} />
        <Skeleton width="25%" height={16} />
        <Skeleton width="25%" height={16} />
        <Skeleton width="15%" height={16} />
      </View>

      {/* Table Rows */}
      {Array.from({ length: rows }).map((_, index) => (
        <View key={index} style={[styles.tableRow, { backgroundColor: theme.colors.surface }]}>
          <Skeleton width="30%" height={14} />
          <Skeleton width="25%" height={14} />
          <Skeleton width="25%" height={14} />
          <Skeleton width="15%" height={14} />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderText: {
    flex: 1,
    marginLeft: 12,
  },
  cardBody: {
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginVertical: 16,
  },
  statCard: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginVertical: 6,
  },
  listItemText: {
    flex: 1,
    marginLeft: 12,
  },
  profileContainer: {
    padding: 16,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profileCards: {
    marginBottom: 24,
  },
  profileCard: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  profileActions: {
    marginTop: 16,
  },
  dashboardContainer: {
    padding: 16,
  },
  dashboardHeader: {
    marginBottom: 24,
  },
  recentSection: {
    marginTop: 24,
  },
  listContainer: {
    padding: 16,
  },
  tableContainer: {
    padding: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    marginBottom: 6,
  },
});
