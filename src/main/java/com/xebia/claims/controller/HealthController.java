package com.xebia.claims.controller;

import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {

  // GAP: the OpenAPI schema for GET /health was not available in this task; shape {"status":"UP"}
  // is taken from the task description and must be confirmed against references/SVC-001.md.
  @GetMapping("/health")
  public Map<String, String> health() {
    return Map.of("status", "UP");
  }
}
