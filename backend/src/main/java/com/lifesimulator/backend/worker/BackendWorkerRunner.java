package com.lifesimulator.backend.worker;

import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Component;

@Component
public class BackendWorkerRunner implements ApplicationRunner {

  private static final Logger LOGGER = LoggerFactory.getLogger(BackendWorkerRunner.class);

  private final ApplicationContext applicationContext;
  private final BackendWorkerService workerService;

  public BackendWorkerRunner(
    ApplicationContext applicationContext,
    BackendWorkerService workerService
  ) {
    this.applicationContext = applicationContext;
    this.workerService = workerService;
  }

  @Override
  public void run(ApplicationArguments args) {
    if (!args.containsOption("backend.job")) {
      return;
    }

    String job = args.getOptionValues("backend.job").getFirst();
    Map<String, Object> result = switch (job) {
      case "log" -> workerService.runLogWorker();
      case "drift" -> workerService.runDriftWorker(intOption(args, "bucket-hours", 24));
      case "eval" -> workerService.runEvalWorker(intOption(args, "limit", 50));
      default -> throw new IllegalArgumentException("Unsupported backend job: " + job);
    };
    LOGGER.info("[backend-worker] job={} result={}", job, result);
    SpringApplication.exit(applicationContext, () -> 0);
  }

  private int intOption(ApplicationArguments args, String name, int fallback) {
    if (!args.containsOption(name)) {
      return fallback;
    }
    return Integer.parseInt(args.getOptionValues(name).getFirst());
  }
}
