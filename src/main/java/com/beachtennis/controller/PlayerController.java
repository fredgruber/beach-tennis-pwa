package com.beachtennis.controller;

import com.beachtennis.model.Player;
import com.beachtennis.repository.PlayerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/players")
@CrossOrigin(origins = "*")
public class PlayerController {

    @Autowired
    private PlayerRepository playerRepository;

    @GetMapping
    public List<Player> getAllPlayers() {
        return playerRepository.findAll();
    }

    @PostMapping
    public ResponseEntity<Player> createPlayer(@RequestBody Player player) {
        Player savedPlayer = playerRepository.save(player);
        return new ResponseEntity<>(savedPlayer, HttpStatus.CREATED);
    }

    @PostMapping("/import")
    public ResponseEntity<List<Player>> importPlayers(@RequestBody List<Player> players) {
        List<Player> savedPlayers = playerRepository.saveAll(players);
        return new ResponseEntity<>(savedPlayers, HttpStatus.CREATED);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePlayer(@PathVariable Long id) {
        if (playerRepository.existsById(id)) {
            playerRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}
