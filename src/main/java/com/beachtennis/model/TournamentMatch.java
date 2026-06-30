package com.beachtennis.model;

import jakarta.persistence.*;

@Entity
public class TournamentMatch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "tournament_id")
    private Tournament tournament;

    // For Dupla Fixa, we can associate with Team entities
    @ManyToOne
    @JoinColumn(name = "team1_id")
    private Team team1;

    @ManyToOne
    @JoinColumn(name = "team2_id")
    private Team team2;

    // Individual players involved in the match
    // Team A: player1 & player2
    @ManyToOne
    @JoinColumn(name = "player1_id")
    private Player player1;

    @ManyToOne
    @JoinColumn(name = "player2_id")
    private Player player2;

    // Team B: player3 & player4
    @ManyToOne
    @JoinColumn(name = "player3_id")
    private Player player3;

    @ManyToOne
    @JoinColumn(name = "player4_id")
    private Player player4;

    private Integer score1 = 0; // Games won by Team A (player1 & player2)
    private Integer score2 = 0; // Games won by Team B (player3 & player4)

    @Enumerated(EnumType.STRING)
    private MatchStatus status = MatchStatus.PENDING;

    private Integer roundNumber;
    private String courtName;

    public TournamentMatch() {}

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Tournament getTournament() {
        return tournament;
    }

    public void setTournament(Tournament tournament) {
        this.tournament = tournament;
    }

    public Team getTeam1() {
        return team1;
    }

    public void setTeam1(Team team1) {
        this.team1 = team1;
    }

    public Team getTeam2() {
        return team2;
    }

    public void setTeam2(Team team2) {
        this.team2 = team2;
    }

    public Player getPlayer1() {
        return player1;
    }

    public void setPlayer1(Player player1) {
        this.player1 = player1;
    }

    public Player getPlayer2() {
        return player2;
    }

    public void setPlayer2(Player player2) {
        this.player2 = player2;
    }

    public Player getPlayer3() {
        return player3;
    }

    public void setPlayer3(Player player3) {
        this.player3 = player3;
    }

    public Player getPlayer4() {
        return player4;
    }

    public void setPlayer4(Player player4) {
        this.player4 = player4;
    }

    public Integer getScore1() {
        return score1;
    }

    public void setScore1(Integer score1) {
        this.score1 = score1;
    }

    public Integer getScore2() {
        return score2;
    }

    public void setScore2(Integer score2) {
        this.score2 = score2;
    }

    public MatchStatus getStatus() {
        return status;
    }

    public void setStatus(MatchStatus status) {
        this.status = status;
    }

    public Integer getRoundNumber() {
        return roundNumber;
    }

    public void setRoundNumber(Integer roundNumber) {
        this.roundNumber = roundNumber;
    }

    public String getCourtName() {
        return courtName;
    }

    public void setCourtName(String courtName) {
        this.courtName = courtName;
    }
}
