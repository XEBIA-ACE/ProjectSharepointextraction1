package com.xebia.claims.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

/** Spring Data JPA wiring; datasource is configured from DB_URL, DB_USERNAME, DB_PASSWORD. */
@Configuration
@EnableJpaRepositories(basePackages = "com.xebia.claims.infrastructure.repository")
public class PersistenceConfig {}
