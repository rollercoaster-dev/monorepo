import { Suspense, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUnistyles } from 'react-native-unistyles';
import { useQuery } from '@evolu/react';
import type { AppOwner } from '@evolu/common/local-first';
import {
  evolu,
  goalsQuery,
  createGoal,
  completeGoal,
  uncompleteGoal,
  deleteGoal,
  GoalStatus,
} from '../../db';
import { styles } from './GoalScreen.styles';

type GoalRow = typeof goalsQuery.Row;

function GoalItemSeparator(): React.JSX.Element {
  return <View style={styles.goalSeparator} />;
}

function GoalList(): React.JSX.Element {
  const { theme } = useUnistyles();
  const rows = useQuery(goalsQuery);
  const [newTitle, setNewTitle] = useState('');

  function handleAdd(): void {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    createGoal(trimmed);
    setNewTitle('');
  }

  function handleToggle(row: GoalRow): void {
    if (row.status === GoalStatus.completed) {
      uncompleteGoal(row.id);
    } else {
      completeGoal(row.id);
    }
  }

  function handleDelete(row: GoalRow): void {
    Alert.alert('Delete Goal', `Delete "${row.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteGoal(row.id),
      },
    ]);
  }

  return (
    <View style={styles.listSection}>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="What do you want to learn?"
          placeholderTextColor={theme.colors.textMuted}
          value={newTitle}
          onChangeText={setNewTitle}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
        />
        <Pressable style={styles.addButton} onPress={handleAdd}>
          <Text style={styles.addButtonText}>Add</Text>
        </Pressable>
      </View>

      {rows.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No goals yet</Text>
          <Text style={styles.emptyBody}>
            Add your first learning goal above to get started.
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.deleteHint}>
            Tap to toggle status. Long-press to delete.
          </Text>
          <FlatList
            data={rows}
            scrollEnabled={false}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const isCompleted = item.status === GoalStatus.completed;
              return (
                <Pressable
                  style={[
                    styles.goalCard,
                    isCompleted && styles.goalCardCompleted,
                  ]}
                  onPress={() => handleToggle(item)}
                  onLongPress={() => handleDelete(item)}
                >
                  <View style={styles.goalInfo}>
                    <Text
                      style={[
                        styles.goalTitle,
                        isCompleted && styles.goalTitleCompleted,
                      ]}
                    >
                      {item.title}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      isCompleted
                        ? styles.statusBadgeCompleted
                        : styles.statusBadgeActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        isCompleted
                          ? styles.statusBadgeTextCompleted
                          : styles.statusBadgeTextActive,
                      ]}
                    >
                      {isCompleted ? 'Done' : 'Active'}
                    </Text>
                  </View>
                </Pressable>
              );
            }}
            ItemSeparatorComponent={GoalItemSeparator}
          />
        </>
      )}
    </View>
  );
}

function OwnerInfo(): React.JSX.Element | null {
  const [owner, setOwner] = useState<AppOwner | null>(null);

  useEffect(() => {
    evolu.appOwner.then(setOwner);
  }, []);

  if (!owner) return null;

  return (
    <View style={styles.devSection}>
      <Text style={styles.devTitle}>Dev: Owner Info</Text>
      <Text style={styles.devText} selectable>
        Owner ID: {owner.id}
      </Text>
      {owner.mnemonic && (
        <Text style={styles.devText} selectable>
          Mnemonic: {owner.mnemonic}
        </Text>
      )}
    </View>
  );
}

export function GoalScreen(): React.JSX.Element {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Goals</Text>
          <Text style={styles.subtitle}>
            Track your learning goals. Powered by Evolu.
          </Text>
        </View>

        <Suspense
          fallback={
            <ActivityIndicator style={styles.loadingIndicator} size="large" />
          }
        >
          <GoalList />
        </Suspense>

        {__DEV__ && <OwnerInfo />}
      </ScrollView>
    </SafeAreaView>
  );
}
