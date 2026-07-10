package com.beachtennis.controller;

import com.beachtennis.model.Player;
import com.beachtennis.model.Tournament;
import com.beachtennis.model.TournamentMatch;
import com.beachtennis.model.TournamentType;
import com.beachtennis.repository.TournamentMatchRepository;
import com.beachtennis.repository.TournamentRepository;
import com.beachtennis.service.TournamentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tournaments")
@CrossOrigin(origins = "*")
public class TournamentController {

    @Autowired
    private TournamentService tournamentService;

    @Autowired
    private TournamentRepository tournamentRepository;

    @Autowired
    private TournamentMatchRepository matchRepository;

    @GetMapping
    public List<Tournament> getAllTournaments() {
        return tournamentRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Tournament> getTournamentById(@PathVariable Long id) {
        return tournamentRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/dupla-fixa")
    public ResponseEntity<Tournament> createDuplaFixaTournament(@RequestBody DuplaFixaRequest request) {
        try {
            Tournament tournament = tournamentService.createDuplaFixaTournament(request.getName(), request.getTeams());
            return new ResponseEntity<>(tournament, HttpStatus.CREATED);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/rei-da-praia")
    public ResponseEntity<Tournament> createReiDaPraiaTournament(@RequestBody ReiDaPraiaRequest request) {
        try {
            Tournament tournament = tournamentService.createReiDaPraiaTournament(request.getName(), request.getPlayerIds());
            return new ResponseEntity<>(tournament, HttpStatus.CREATED);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/{id}/players")
    public ResponseEntity<List<Player>> getTournamentPlayers(@PathVariable Long id) {
        return tournamentRepository.findById(id)
                .map(t -> ResponseEntity.ok(t.getPlayers()))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/matches")
    public ResponseEntity<List<TournamentMatch>> getTournamentMatches(@PathVariable Long id) {
        return tournamentRepository.findById(id)
                .map(t -> ResponseEntity.ok(matchRepository.findByTournament(t)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/matches/{matchId}")
    public ResponseEntity<TournamentMatch> updateMatchScore(
            @PathVariable Long matchId,
            @RequestBody MatchScoreRequest request) {
        try {
            TournamentMatch updatedMatch = tournamentService.updateMatchScore(matchId, request.getScore1(), request.getScore2());
            return ResponseEntity.ok(updatedMatch);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/{id}/matches")
    public ResponseEntity<TournamentMatch> addMatch(
            @PathVariable Long id,
            @RequestBody AddMatchRequest request) {
        try {
            TournamentMatch newMatch = tournamentService.addMatch(id, request);
            return new ResponseEntity<>(newMatch, HttpStatus.CREATED);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/{id}/matches/generate-missing")
    public ResponseEntity<List<TournamentMatch>> generateMissingMatches(@PathVariable Long id) {
        try {
            List<TournamentMatch> created = tournamentService.generateMissingMatches(id);
            return ResponseEntity.ok(created);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping("/matches/{matchId}/details")
    public ResponseEntity<TournamentMatch> updateMatchDetails(
            @PathVariable Long matchId,
            @RequestBody AddMatchRequest request) {
        try {
            TournamentMatch updatedMatch = tournamentService.updateMatchDetails(matchId, request);
            return ResponseEntity.ok(updatedMatch);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/matches/{matchId}")
    public ResponseEntity<Void> deleteMatch(@PathVariable Long matchId) {
        try {
            tournamentService.deleteMatch(matchId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/{id}/standings")
    public ResponseEntity<?> getTournamentStandings(@PathVariable Long id) {
        return tournamentRepository.findById(id)
                .map(t -> {
                    if (t.getType() == TournamentType.DUPLA_FIXA) {
                        return ResponseEntity.ok(tournamentService.getDuplaFixaStandings(id));
                    } else {
                        return ResponseEntity.ok(tournamentService.getReiDaPraiaStandings(id));
                    }
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTournament(@PathVariable Long id) {
        if (tournamentRepository.existsById(id)) {
            tournamentRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }

    // Request DTOs
    public static class AddMatchRequest {
        private Long player1Id;
        private Long player2Id;
        private Long player3Id;
        private Long player4Id;
        private Integer roundNumber;
        private String courtName;

        public Long getPlayer1Id() { return player1Id; }
        public void setPlayer1Id(Long player1Id) { this.player1Id = player1Id; }
        public Long getPlayer2Id() { return player2Id; }
        public void setPlayer2Id(Long player2Id) { this.player2Id = player2Id; }
        public Long getPlayer3Id() { return player3Id; }
        public void setPlayer3Id(Long player3Id) { this.player3Id = player3Id; }
        public Long getPlayer4Id() { return player4Id; }
        public void setPlayer4Id(Long player4Id) { this.player4Id = player4Id; }
        public Integer getRoundNumber() { return roundNumber; }
        public void setRoundNumber(Integer roundNumber) { this.roundNumber = roundNumber; }
        public String getCourtName() { return courtName; }
        public void setCourtName(String courtName) { this.courtName = courtName; }
    }

    public static class DuplaFixaRequest {
        private String name;
        private List<List<Long>> teams;

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public List<List<Long>> getTeams() { return teams; }
        public void setTeams(List<List<Long>> teams) { this.teams = teams; }
    }

    public static class ReiDaPraiaRequest {
        private String name;
        private List<Long> playerIds;

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public List<Long> getPlayerIds() { return playerIds; }
        public void setPlayerIds(List<Long> playerIds) { this.playerIds = playerIds; }
    }

    public static class MatchScoreRequest {
        private int score1;
        private int score2;

        public int getScore1() { return score1; }
        public void setScore1(int score1) { this.score1 = score1; }
        public int getScore2() { return score2; }
        public void setScore2(int score2) { this.score2 = score2; }
    }
}
