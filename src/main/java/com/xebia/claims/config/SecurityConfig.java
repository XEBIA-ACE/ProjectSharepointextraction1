package com.xebia.claims.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

  // GAP: authentication mechanism (JWT/OAuth2 issuer, RBAC such as triage:assign) is not defined
  // in the scaffold scope. Only /health is public; everything else requires authentication.
  @Bean
  SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http.csrf(AbstractHttpConfigurer::disable)
        .authorizeHttpRequests(
            auth -> auth.requestMatchers("/health").permitAll().anyRequest().authenticated())
        .httpBasic(Customizer.withDefaults());
    return http.build();
  }
}
