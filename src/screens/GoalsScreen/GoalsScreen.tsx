import React, { Suspense, useState } from 'react';
import { View, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@evolu/react';
import { useUnistyles } from 'react-native-unistyles';
import { Text } from '../../components/Text';
import { IconButton } from '../../components/IconButton';
import { GoalCard, type GoalCardGoal } from '../../components/GoalCard';
import { EmptyState } from '../../components/EmptyState';
import { Divider } from '../../components/Divider';
import { ConfirmDeleteModal } from '../ConfirmDeleteModal';
import { goalsQuery, deleteGoal, GoalStatus } from '../../db';
import { GoalsStackParamList } from '../../navigation/types';
import { styles } from './GoalsScreen.styles';

type GoalRow = typeof goalsQuery.Row;
type Nav = NativeStackNavigationProp<GoalsStackParamList>;

function toGoalCardGoal(row: GoalRow): GoalCardGoal {
  return {
    id: row.id,
    title: row.title ?? '',
    status: row.status === GoalStatus.completed ? 'completed' : 'active',
    stepsTotal: 0,
    stepsCompleted: 0,
  };
}

function GoalList() {
  const navigation = useNavigation<Nav>();
  const rows = useQuery(goalsQuery);
  const [deleteTarget, setDeleteTarget] = useState<GoalRow | null>(null);

  function handleDelete(row: GoalRow) {
    setDeleteTarget(row);
  }

  function confirmDelete() {
    if (deleteTarget) {
      deleteGoal(deleteTarget.id);
      setDeleteTarget(null);
    }
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No goals yet"
        body="Add your first learning goal to get started."
        action={{
          label: 'Create Goal',
          onPress: () => navigation.navigate('NewGoal'),
        }}
      />
    );
  }

  return (
    <>
      <FlatList
        data={rows}
        scrollEnabled={false}
        keyExtractor={(item) => item.id}
        style={{ overflow: 'visible' }}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <GoalCard
            goal={toGoalCardGoal(item)}
            onPress={() => navigation.navigate('GoalDetail', { goalId: item.id })}
            onLongPress={() => handleDelete(item)}
          />
        )}
      />
      <ConfirmDeleteModal
        visible={deleteTarget !== null}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete this goal?"
        message={deleteTarget ? `"${deleteTarget.title}" and all progress will be permanently deleted.` : ''}
      />
    </>
  );
}

export function GoalsScreen() {
  const navigation = useNavigation<Nav>();
  // Subscribe to theme changes to trigger re-renders
  const { theme } = useUnistyles();

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={styles.scrollContent}>
        <View style={styles.header}>
          <Text variant="display">Goals</Text>
          <IconButton
            icon={<Text variant="headline" style={styles.addIcon}>+</Text>}
            onPress={() => navigation.navigate('NewGoal')}
            accessibilityLabel="Create new goal"
          />
        </View>
        <Divider />
        <Suspense
          fallback={
            <ActivityIndicator style={styles.loadingIndicator} size="large" />
          }
        >
          <GoalList />
        </Suspense>
      </View>
    </SafeAreaView>
  );
}
