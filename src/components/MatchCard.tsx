import { StyleSheet, Text, View } from 'react-native';
import { Match } from '../types/match';
import { formatMatchDateTime, formatScore, getStatusInfo, StatusTone } from '../utils/matches';
import { FavoriteButton } from './FavoriteButton';

type Props = {
  match: Match;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
};

export function MatchCard({ match, isFavorite, onToggleFavorite }: Props) {
  const statusInfo = getStatusInfo(match);
  const scoreText = formatScore(match.score);
  const dateTimeText = formatMatchDateTime(match.startsAt);
  const isLive = match.status === 'live';

  return (
    <View style={[styles.card, isLive && styles.cardLive]}>
      <View style={styles.headerRow}>
        <View style={[styles.statusBadge, badgeStylesByTone[statusInfo.tone]]}>
          {isLive && <View style={styles.liveDot} />}
          <Text style={[styles.statusText, textStylesByTone[statusInfo.tone]]}>
            {statusInfo.label}
          </Text>
        </View>

        <Text style={styles.dateText} numberOfLines={1}>
          {dateTimeText}
        </Text>

        <FavoriteButton
          active={isFavorite}
          onPress={() => onToggleFavorite(match.id)}
        />
      </View>

      <View style={styles.teamsRow}>
        <View style={styles.teamHome}>
          <Text style={styles.teamName}>{match.home.name}</Text>
          <Text style={styles.teamCity}>{match.home.city}</Text>
        </View>

        <View style={[styles.scoreBox, isLive && styles.scoreBoxLive]}>
          <Text
            style={[
              styles.scoreText,
              scoreText === null && styles.scorePlaceholder,
              isLive && styles.scoreTextLive,
            ]}
          >
            {scoreText ?? '— : —'}
          </Text>
        </View>

        <View style={styles.teamAway}>
          <Text style={[styles.teamName, styles.textRight]}>{match.away.name}</Text>
          <Text style={[styles.teamCity, styles.textRight]}>{match.away.city}</Text>
        </View>
      </View>
    </View>
  );
}

const badgeStylesByTone: Record<StatusTone, object> = {
  finished: { backgroundColor: '#f3f4f6' },
  live: { backgroundColor: '#fee2e2' },
  upcoming: { backgroundColor: '#eff6ff' },
  postponed: { backgroundColor: '#fef3c7' },
  neutral: { backgroundColor: '#f3f4f6' },
};

const textStylesByTone: Record<StatusTone, object> = {
  finished: { color: '#4b5563' },
  live: { color: '#dc2626' },
  upcoming: { color: '#1d4ed8' },
  postponed: { color: '#b45309' },
  neutral: { color: '#4b5563' },
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardLive: {
    borderColor: '#fca5a5',
    backgroundColor: '#fffafa',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#dc2626',
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dateText: {
    flex: 1,
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'right',
    marginRight: 4,
  },
  teamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  teamHome: {
    flex: 1,
    alignItems: 'flex-start',
  },
  teamAway: {
    flex: 1,
    alignItems: 'flex-end',
  },
  teamName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  teamCity: {
    fontSize: 12,
    color: '#6b7280',
  },
  textRight: {
    textAlign: 'right',
  },
  scoreBox: {
    minWidth: 68,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreBoxLive: {
    backgroundColor: '#fee2e2',
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  scorePlaceholder: {
    color: '#9ca3af',
    fontWeight: '500',
  },
  scoreTextLive: {
    color: '#dc2626',
  },
});