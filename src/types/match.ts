export type Team = {
  id: string;
  name: string;
  city: string;
};

export type MatchScore = {
  home: number;
  away: number;
};

export type KnownMatchStatus = 'scheduled' | 'live' | 'finished' | 'postponed';

export type MatchStatus = KnownMatchStatus | (string & {});

export type Match = {
  id: string;
  startsAt: string | null;
  status: MatchStatus;
  minute?: number;
  home: Team;
  away: Team;
  score: MatchScore | null;
};

export type MatchesResponse = {
  round: number;
  matches: Match[];
};

export type MatchFilter = 'all' | 'upcoming' | 'finished';