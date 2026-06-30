package com.beachtennis.service;

import com.beachtennis.dto.PlayerStanding;
import com.beachtennis.dto.TeamStanding;
import com.beachtennis.model.*;
import com.beachtennis.repository.PlayerRepository;
import com.beachtennis.repository.TeamRepository;
import com.beachtennis.repository.TournamentMatchRepository;
import com.beachtennis.repository.TournamentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class TournamentService {

    @Autowired
    private TournamentRepository tournamentRepository;

    @Autowired
    private PlayerRepository playerRepository;

    @Autowired
    private TeamRepository teamRepository;

    @Autowired
    private TournamentMatchRepository matchRepository;

    @Transactional
    public Tournament createDuplaFixaTournament(String name, List<List<Long>> teamPlayerIds) {
        Tournament tournament = new Tournament(name, TournamentType.DUPLA_FIXA, TournamentStatus.ACTIVE);
        
        // Collect all unique players
        Set<Long> allPlayerIds = teamPlayerIds.stream()
                .flatMap(List::stream)
                .collect(Collectors.toSet());
        List<Player> players = playerRepository.findAllById(allPlayerIds);
        tournament.setPlayers(players);
        
        tournament = tournamentRepository.save(tournament);

        // Create teams
        List<Team> teams = new ArrayList<>();
        for (List<Long> pair : teamPlayerIds) {
            if (pair.size() == 2) {
                Player p1 = playerRepository.findById(pair.get(0)).orElse(null);
                Player p2 = playerRepository.findById(pair.get(1)).orElse(null);
                if (p1 != null && p2 != null) {
                    Team team = new Team(p1, p2, tournament);
                    teams.add(teamRepository.save(team));
                }
            }
        }

        // Generate round-robin matches for teams
        generateDuplaFixaMatches(tournament, teams);

        return tournament;
    }

    @Transactional
    public Tournament createReiDaPraiaTournament(String name, List<Long> playerIds) {
        Tournament tournament = new Tournament(name, TournamentType.REI_DA_PRAIA, TournamentStatus.ACTIVE);
        List<Player> players = playerRepository.findAllById(playerIds);
        // Shuffle to randomize groups
        Collections.shuffle(players);
        tournament.setPlayers(players);
        
        tournament = tournamentRepository.save(tournament);

        // Partition players into groups of 4 and 5
        List<List<Player>> groups = partitionPlayers(players);

        // Generate rotation matches for each group
        generateReiDaPraiaMatches(tournament, groups);

        return tournament;
    }

    private List<List<Player>> partitionPlayers(List<Player> players) {
        int n = players.size();
        
        // Optimize to maximize number of players in groups of 4 and 5
        int maxPlayers = 0;
        int bestA = 0; // groups of 4
        int bestB = 0; // groups of 5
        
        for (int a = 0; 4 * a <= n; a++) {
            for (int b = 0; 4 * a + 5 * b <= n; b++) {
                int total = 4 * a + 5 * b;
                if (total > maxPlayers) {
                    maxPlayers = total;
                    bestA = a;
                    bestB = b;
                } else if (total == maxPlayers && total > 0) {
                    if (a > bestA) {
                        bestA = a;
                        bestB = b;
                    }
                }
            }
        }

        List<List<Player>> groups = new ArrayList<>();
        int index = 0;
        for (int i = 0; i < bestA; i++) {
            List<Player> group = new ArrayList<>();
            for (int j = 0; j < 4; j++) {
                group.add(players.get(index++));
            }
            groups.add(group);
        }
        for (int i = 0; i < bestB; i++) {
            List<Player> group = new ArrayList<>();
            for (int j = 0; j < 5; j++) {
                group.add(players.get(index++));
            }
            groups.add(group);
        }
        return groups;
    }

    private void generateDuplaFixaMatches(Tournament tournament, List<Team> teams) {
        List<Team> list = new ArrayList<>(teams);
        if (list.size() % 2 != 0) {
            list.add(null); // BYE
        }
        int numTeams = list.size();
        int numRounds = numTeams - 1;
        int matchesPerRound = numTeams / 2;

        for (int round = 0; round < numRounds; round++) {
            for (int match = 0; match < matchesPerRound; match++) {
                int home = (round + match) % (numTeams - 1);
                int away = (numTeams - 1 - match + round) % (numTeams - 1);
                if (match == 0) {
                    away = numTeams - 1;
                }

                Team t1 = list.get(home);
                Team t2 = list.get(away);

                if (t1 != null && t2 != null) {
                    TournamentMatch newMatch = new TournamentMatch();
                    newMatch.setTournament(tournament);
                    newMatch.setTeam1(t1);
                    newMatch.setTeam2(t2);
                    newMatch.setPlayer1(t1.getPlayer1());
                    newMatch.setPlayer2(t1.getPlayer2());
                    newMatch.setPlayer3(t2.getPlayer1());
                    newMatch.setPlayer4(t2.getPlayer2());
                    newMatch.setRoundNumber(round + 1);
                    newMatch.setCourtName("Quadra " + (match + 1));
                    matchRepository.save(newMatch);
                }
            }
        }
    }

    private void generateReiDaPraiaMatches(Tournament tournament, List<List<Player>> groups) {
        int groupNum = 1;
        for (List<Player> group : groups) {
            String courtName = "Grupo " + groupNum;
            if (group.size() == 4) {
                Player a = group.get(0);
                Player b = group.get(1);
                Player c = group.get(2);
                Player d = group.get(3);

                // Round 1: A+B vs C+D
                createReiMatch(tournament, a, b, c, d, 1, courtName);
                // Round 2: A+C vs B+D
                createReiMatch(tournament, a, c, b, d, 2, courtName);
                // Round 3: A+D vs B+C
                createReiMatch(tournament, a, d, b, c, 3, courtName);
            } else if (group.size() == 5) {
                Player a = group.get(0);
                Player b = group.get(1);
                Player c = group.get(2);
                Player d = group.get(3);
                Player e = group.get(4);

                // Round 1: A+B vs C+D (E rests)
                createReiMatch(tournament, a, b, c, d, 1, courtName);
                // Round 2: A+E vs B+C (D rests)
                createReiMatch(tournament, a, e, b, c, 2, courtName);
                // Round 3: D+E vs A+C (B rests)
                createReiMatch(tournament, d, e, a, c, 3, courtName);
                // Round 4: B+D vs C+E (A rests)
                createReiMatch(tournament, b, d, c, e, 4, courtName);
                // Round 5: A+D vs B+E (C rests)
                createReiMatch(tournament, a, d, b, e, 5, courtName);
            }
            groupNum++;
        }
    }

    private void createReiMatch(Tournament tournament, Player p1, Player p2, Player p3, Player p4, int round, String courtName) {
        TournamentMatch match = new TournamentMatch();
        match.setTournament(tournament);
        match.setPlayer1(p1);
        match.setPlayer2(p2);
        match.setPlayer3(p3);
        match.setPlayer4(p4);
        match.setRoundNumber(round);
        match.setCourtName(courtName);
        matchRepository.save(match);
    }

    @Transactional
    public TournamentMatch updateMatchScore(Long matchId, int score1, int score2) {
        TournamentMatch match = matchRepository.findById(matchId)
                .orElseThrow(() -> new IllegalArgumentException("Match not found"));
        match.setScore1(score1);
        match.setScore2(score2);
        match.setStatus(MatchStatus.FINISHED);
        return matchRepository.save(match);
    }

    public List<TeamStanding> getDuplaFixaStandings(Long tournamentId) {
        Tournament tournament = tournamentRepository.findById(tournamentId)
                .orElseThrow(() -> new IllegalArgumentException("Tournament not found"));
        
        List<Team> teams = teamRepository.findByTournament(tournament);
        Map<Long, TeamStanding> standingsMap = new HashMap<>();
        for (Team team : teams) {
            standingsMap.put(team.getId(), new TeamStanding(team));
        }

        List<TournamentMatch> matches = matchRepository.findByTournament(tournament);
        for (TournamentMatch match : matches) {
            if (match.getStatus() == MatchStatus.FINISHED && match.getTeam1() != null && match.getTeam2() != null) {
                TeamStanding s1 = standingsMap.get(match.getTeam1().getId());
                TeamStanding s2 = standingsMap.get(match.getTeam2().getId());
                
                if (s1 != null && s2 != null) {
                    boolean t1Won = match.getScore1() > match.getScore2();
                    s1.addMatch(t1Won, match.getScore1(), match.getScore2());
                    s2.addMatch(!t1Won, match.getScore2(), match.getScore1());
                }
            }
        }

        List<TeamStanding> standings = new ArrayList<>(standingsMap.values());
        Collections.sort(standings);
        return standings;
    }

    public List<PlayerStanding> getReiDaPraiaStandings(Long tournamentId) {
        Tournament tournament = tournamentRepository.findById(tournamentId)
                .orElseThrow(() -> new IllegalArgumentException("Tournament not found"));

        Map<Long, PlayerStanding> standingsMap = new HashMap<>();
        for (Player player : tournament.getPlayers()) {
            standingsMap.put(player.getId(), new PlayerStanding(player));
        }

        List<TournamentMatch> matches = matchRepository.findByTournament(tournament);
        for (TournamentMatch match : matches) {
            if (match.getStatus() == MatchStatus.FINISHED) {
                PlayerStanding s1 = standingsMap.get(match.getPlayer1().getId());
                PlayerStanding s2 = standingsMap.get(match.getPlayer2().getId());
                PlayerStanding s3 = standingsMap.get(match.getPlayer3().getId());
                PlayerStanding s4 = standingsMap.get(match.getPlayer4().getId());

                boolean team1Won = match.getScore1() > match.getScore2();

                if (s1 != null) s1.addMatch(team1Won, match.getScore1(), match.getScore2());
                if (s2 != null) s2.addMatch(team1Won, match.getScore1(), match.getScore2());
                if (s3 != null) s3.addMatch(!team1Won, match.getScore2(), match.getScore1());
                if (s4 != null) s4.addMatch(!team1Won, match.getScore2(), match.getScore1());
            }
        }

        List<PlayerStanding> standings = new ArrayList<>(standingsMap.values());
        Collections.sort(standings);
        return standings;
    }
}
