package com.xebia.claims.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/** Placeholder configuration shell for downstream services; no client logic implemented. */
@Configuration
@EnableConfigurationProperties(ExternalServicesProperties.External.class)
public class ExternalServicesProperties {

  @ConfigurationProperties(prefix = "claims.external")
  public record External(
      String policyUrl,
      String customerUrl,
      String documentUrl,
      String notificationUrl,
      String paymentUrl,
      String rulesEngineUrl) {}
}
