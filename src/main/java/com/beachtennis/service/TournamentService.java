package com.beachtennis.service;

import com.beachtennis.dto.PlayerStanding;
import com.beachtennis.dto.TeamStanding;
import com.beachtennis.model.*;
import com.beachtennis.repository.PlayerRepository;
import com.beachtennis.repository.TeamRepository;
import com.beachtennis.repository.TournamentMatchRepository;
import com.beachtennis.repository.TournamentRepository;
import com.beachtennis.controller.TournamentController;
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
        // Shuffle to randomize starting order
        Collections.shuffle(players);
        tournament.setPlayers(players);
        
        tournament = tournamentRepository.save(tournament);

        // Generate rotation matches for all players together (everyone with/against everyone)
        generateReiDaPraiaMatchesSinglePool(tournament, players);

        return tournament;
    }

    private static class Pair {
        Player p1;
        Player p2;
        Pair(Player p1, Player p2) {
            this.p1 = p1;
            this.p2 = p2;
        }
    }

    private static boolean isDisjoint(Pair a, Pair b) {
        return !a.p1.getId().equals(b.p1.getId()) &&
               !a.p1.getId().equals(b.p2.getId()) &&
               !a.p2.getId().equals(b.p1.getId()) &&
               !a.p2.getId().equals(b.p2.getId());
    }

    private void generateReiDaPraiaMatchesSinglePool(Tournament tournament, List<Player> players) {
        if (players.size() < 4) return;

        List<Pair> remainingPairs = new ArrayList<>();
        for (int i = 0; i < players.size(); i++) {
            for (int j = i + 1; j < players.size(); j++) {
                remainingPairs.add(new Pair(players.get(i), players.get(j)));
            }
        }

        int roundNumber = 1;
        int matchInRound = 1;
        List<TournamentMatch> matches = new ArrayList<>();

        while (!remainingPairs.isEmpty()) {
            Pair p1 = remainingPairs.remove(0);
            Pair p2 = null;

            // Find the first pair in remainingPairs that is disjoint from p1
            for (int i = 0; i < remainingPairs.size(); i++) {
                Pair candidate = remainingPairs.get(i);
                if (isDisjoint(p1, candidate)) {
                    p2 = remainingPairs.remove(i);
                    break;
                }
            }

            if (p2 == null) {
                // Look in the already generated matches to find a pair disjoint from p1
                for (TournamentMatch existing : matches) {
                    Pair candidate = new Pair(existing.getPlayer1(), existing.getPlayer2());
                    if (isDisjoint(p1, candidate)) {
                        p2 = candidate;
                        break;
                    }
                    candidate = new Pair(existing.getPlayer3(), existing.getPlayer4());
                    if (isDisjoint(p1, candidate)) {
                        p2 = candidate;
                        break;
                    }
                }
            }

            // If still null, pick any 2 players other than p1's players
            if (p2 == null) {
                List<Player> others = new ArrayList<>();
                for (Player p : players) {
                    if (!p.getId().equals(p1.p1.getId()) && !p.getId().equals(p1.p2.getId())) {
                        others.add(p);
                    }
                    if (others.size() == 2) break;
                }
                if (others.size() == 2) {
                    p2 = new Pair(others.get(0), others.get(1));
                }
            }

            if (p2 != null) {
                TournamentMatch match = new TournamentMatch();
                match.setTournament(tournament);
                match.setPlayer1(p1.p1);
                match.setPlayer2(p1.p2);
                match.setPlayer3(p2.p1);
                match.setPlayer4(p2.p2);
                match.setRoundNumber(roundNumber);
                match.setCourtName("Quadra " + matchInRound);
                matchRepository.save(match);
                matches.add(match);

                matchInRound++;
                // Max 3 matches/courts per round
                if (matchInRound > 3) {
                    matchInRound = 1;
                    roundNumber++;
                }
            }
        }
    }

    @Transactional
    public TournamentMatch addMatch(Long tournamentId, TournamentController.AddMatchRequest request) {
        Tournament tournament = tournamentRepository.findById(tournamentId)
                .orElseThrow(() -> new IllegalArgumentException("Tournament not found"));

        Player p1 = playerRepository.findById(request.getPlayer1Id()).orElseThrow(() -> new IllegalArgumentException("Player 1 not found"));
        Player p2 = playerRepository.findById(request.getPlayer2Id()).orElseThrow(() -> new IllegalArgumentException("Player 2 not found"));
        Player p3 = playerRepository.findById(request.getPlayer3Id()).orElseThrow(() -> new IllegalArgumentException("Player 3 not found"));
        Player p4 = playerRepository.findById(request.getPlayer4Id()).orElseThrow(() -> new IllegalArgumentException("Player 4 not found"));

        TournamentMatch match = new TournamentMatch();
        match.setTournament(tournament);
        match.setPlayer1(p1);
        match.setPlayer2(p2);
        match.setPlayer3(p3);
        match.setPlayer4(p4);
        match.setRoundNumber(request.getRoundNumber() != null ? request.getRoundNumber() : 1);
        match.setCourtName(request.getCourtName() != null ? request.getCourtName() : "Quadra 1");

        // If it is DUPLA_FIXA, try to associate team1 and team2
        if (tournament.getType() == TournamentType.DUPLA_FIXA) {
            Team team1 = findOrCreateTeam(tournament, p1, p2);
            Team team2 = findOrCreateTeam(tournament, p3, p4);
            match.setTeam1(team1);
            match.setTeam2(team2);
        }

        return matchRepository.save(match);
    }

    private Team findOrCreateTeam(Tournament tournament, Player p1, Player p2) {
        List<Team> teams = teamRepository.findByTournament(tournament);
        for (Team t : teams) {
            if ((t.getPlayer1().getId().equals(p1.getId()) && t.getPlayer2().getId().equals(p2.getId())) ||
                (t.getPlayer1().getId().equals(p2.getId()) && t.getPlayer2().getId().equals(p1.getId()))) {
                return t;
            }
        }
        Team team = new Team(p1, p2, tournament);
        return teamRepository.save(team);
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

    @Transactional
    public List<TournamentMatch> generateMissingMatches(Long tournamentId) {
        Tournament tournament = tournamentRepository.findById(tournamentId)
                .orElseThrow(() -> new IllegalArgumentException("Tournament not found"));

        List<TournamentMatch> existingMatches = matchRepository.findByTournament(tournament);
        List<TournamentMatch> newMatches = new ArrayList<>();

        if (tournament.getType() == TournamentType.DUPLA_FIXA) {
            List<Team> teams = teamRepository.findByTournament(tournament);
            Set<String> playedTeamPairs = new HashSet<>();
            for (TournamentMatch match : existingMatches) {
                if (match.getTeam1() != null && match.getTeam2() != null) {
                    playedTeamPairs.add(getPairKey(match.getTeam1().getId(), match.getTeam2().getId()));
                }
            }

            int nextRound = existingMatches.stream()
                    .mapToInt(m -> m.getRoundNumber() != null ? m.getRoundNumber() : 1)
                    .max()
                    .orElse(0) + 1;

            int matchInRound = 1;
            for (int i = 0; i < teams.size(); i++) {
                for (int j = i + 1; j < teams.size(); j++) {
                    Team t1 = teams.get(i);
                    Team t2 = teams.get(j);
                    String key = getPairKey(t1.getId(), t2.getId());
                    if (!playedTeamPairs.contains(key)) {
                        TournamentMatch match = new TournamentMatch();
                        match.setTournament(tournament);
                        match.setTeam1(t1);
                        match.setTeam2(t2);
                        match.setPlayer1(t1.getPlayer1());
                        match.setPlayer2(t1.getPlayer2());
                        match.setPlayer3(t2.getPlayer1());
                        match.setPlayer4(t2.getPlayer2());
                        match.setRoundNumber(nextRound);
                        match.setCourtName("Quadra " + matchInRound);
                        
                        newMatches.add(matchRepository.save(match));
                        playedTeamPairs.add(key);

                        matchInRound++;
                        if (matchInRound > 3) {
                            matchInRound = 1;
                            nextRound++;
                        }
                    }
                }
            }
        } else {
            List<Player> players = tournament.getPlayers();
            Set<String> playedPlayerPairs = new HashSet<>();
            for (TournamentMatch match : existingMatches) {
                if (match.getPlayer1() != null && match.getPlayer2() != null &&
                    match.getPlayer3() != null && match.getPlayer4() != null) {
                    List<Long> teamASide = List.of(match.getPlayer1().getId(), match.getPlayer2().getId());
                    List<Long> teamBSide = List.of(match.getPlayer3().getId(), match.getPlayer4().getId());
                    for (Long pA : teamASide) {
                        for (Long pB : teamBSide) {
                            playedPlayerPairs.add(getPairKey(pA, pB));
                        }
                    }
                }
            }

            List<PlayerPair> missingPairs = new ArrayList<>();
            for (int i = 0; i < players.size(); i++) {
                for (int j = i + 1; j < players.size(); j++) {
                    Player p1 = players.get(i);
                    Player p2 = players.get(j);
                    String key = getPairKey(p1.getId(), p2.getId());
                    if (!playedPlayerPairs.contains(key)) {
                        missingPairs.add(new PlayerPair(p1, p2));
                    }
                }
            }

            int nextRound = existingMatches.stream()
                    .mapToInt(m -> m.getRoundNumber() != null ? m.getRoundNumber() : 1)
                    .max()
                    .orElse(0) + 1;
            int matchInRound = 1;

            while (!missingPairs.isEmpty()) {
                PlayerPair firstPair = missingPairs.remove(0);
                Player a = firstPair.p1;
                Player c = firstPair.p2;

                PlayerPair secondPair = null;
                for (int i = 0; i < missingPairs.size(); i++) {
                    PlayerPair candidate = missingPairs.get(i);
                    if (!candidate.p1.getId().equals(a.getId()) &&
                        !candidate.p1.getId().equals(c.getId()) &&
                        !candidate.p2.getId().equals(a.getId()) &&
                        !candidate.p2.getId().equals(c.getId())) {
                        secondPair = missingPairs.remove(i);
                        break;
                    }
                }

                Player b = null;
                Player d = null;
                if (secondPair != null) {
                    b = secondPair.p1;
                    d = secondPair.p2;
                } else {
                    List<Player> others = new ArrayList<>();
                    for (Player p : players) {
                        if (!p.getId().equals(a.getId()) && !p.getId().equals(c.getId())) {
                            others.add(p);
                        }
                        if (others.size() == 2) break;
                    }
                    if (others.size() == 2) {
                        b = others.get(0);
                        d = others.get(1);
                    }
                }

                if (b != null && d != null) {
                    TournamentMatch match = new TournamentMatch();
                    match.setTournament(tournament);
                    match.setPlayer1(a);
                    match.setPlayer2(b);
                    match.setPlayer3(c);
                    match.setPlayer4(d);
                    match.setRoundNumber(nextRound);
                    match.setCourtName("Quadra " + matchInRound);
                    
                    newMatches.add(matchRepository.save(match));
                    removeCoveredPairs(missingPairs, a, b, c, d);

                    matchInRound++;
                    if (matchInRound > 3) {
                        matchInRound = 1;
                        nextRound++;
                    }
                }
            }
        }

        return newMatches;
    }

    private String getPairKey(long id1, long id2) {
        return id1 < id2 ? id1 + "-" + id2 : id2 + "-" + id1;
    }

    private static class PlayerPair {
        Player p1;
        Player p2;
        PlayerPair(Player p1, Player p2) {
            this.p1 = p1;
            this.p2 = p2;
        }
    }

    private void removeCoveredPairs(List<PlayerPair> missingPairs, Player a, Player b, Player c, Player d) {
        Set<String> covered = new HashSet<>();
        covered.add(getPairKey(a.getId(), c.getId()));
        covered.add(getPairKey(a.getId(), d.getId()));
        covered.add(getPairKey(b.getId(), c.getId()));
        covered.add(getPairKey(b.getId(), d.getId()));

        missingPairs.removeIf(pair -> covered.contains(getPairKey(pair.p1.getId(), pair.p2.getId())));
    }
}
