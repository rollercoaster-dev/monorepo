# Neuro-Friendly Logger Improvement Tasks

This file outlines potential improvements for the `@rollercoaster-dev/rd-logger` package based on recent review.

- [ ] **Implement Dynamic Configuration Updates**
    - **Goal:** Allow changing logger settings (especially `level`) after initialization.
    - **Details:**
        - Add a public method like `setLevel(newLevel: LogLevel)` to the `Logger` class.
        - Consider a more general `updateConfig(options: Partial<LoggerConfig>)` for broader runtime changes (e.g., toggling `prettyPrint`, `logToFile`).
        - Ensure internal state (`this.config`) is updated correctly.
    - **Benefit:** Improves testability for consuming applications and adds runtime flexibility for debugging/operations.

- [ ] **Implement Asynchronous File Logging**
    - **Goal:** Prevent file I/O from blocking the Node.js event loop.
    - **Details:**
        - Replace `fs.appendFileSync` in `writeToLogFile` with an asynchronous alternative (e.g., `fs.promises.appendFile`).
        - Consider using a write stream (`fs.createWriteStream`) with appropriate flags (`'a'`).
        - May require managing an internal buffer or queue to handle log messages efficiently without losing data during high load or async operations.
    - **Benefit:** Improves application performance, especially under high logging volume.

- [ ] **Introduce Extensibility (Transports & Formatters)**
    - **Goal:** Allow users to easily add new output destinations and customize log formatting.
    - **Details:**
        - **Transports:** Refactor the output logic to use a transport system.
            - Define a `Transport` interface.
            - Implement core transports (e.g., `ConsoleTransport`, `FileTransport`).
            - Allow users to pass an array of transport instances during logger initialization or add/remove them dynamically.
        - **Formatters:** Allow users to provide custom formatting functions.
            - Define a `Formatter` function signature/interface.
            - Allow specifying a formatter during initialization or potentially per-transport.
    - **Benefit:** Makes the logger significantly more flexible and adaptable to diverse logging needs (e.g., multiple files, databases, external services) and output styles.
