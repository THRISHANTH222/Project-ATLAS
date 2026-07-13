import json
import logging
import sys
from contextvars import ContextVar
from datetime import datetime, timezone
from typing import Any, Dict

# Context variable to store correlation ID for requests tracing
correlation_id_ctx: ContextVar[str] = ContextVar("correlation_id", default="")


class StructuredJsonFormatter(logging.Formatter):
    """
    Custom formatter that outputs logs as JSON lines for production environments.
    """

    def format(self, record: logging.LogRecord) -> str:
        log_data: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "correlation_id": correlation_id_ctx.get(""),
        }

        # Include exception details if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        # Include stack trace info if present
        if record.stack_info:
            log_data["stack_trace"] = self.formatStack(record.stack_info)

        # Merge extra attributes if provided, avoiding overwriting core keys
        if hasattr(record, "extra") and isinstance(record.extra, dict):  # type: ignore
            for key, val in record.extra.items():  # type: ignore
                if key not in log_data:
                    log_data[key] = val

        # Handle other custom attributes on the record itself
        # (Exclude standard LogRecord attributes)
        standard_attrs = {
            "name",
            "msg",
            "args",
            "levelname",
            "levelno",
            "pathname",
            "filename",
            "module",
            "exc_info",
            "exc_text",
            "stack_info",
            "lineno",
            "funcName",
            "created",
            "msecs",
            "relativeCreated",
            "thread",
            "threadName",
            "processName",
            "process",
        }
        for key, val in record.__dict__.items():
            if key not in standard_attrs and key not in log_data:
                log_data[key] = val

        return json.dumps(log_data)


def setup_logging(log_level: str = "INFO", environment: str = "development") -> None:
    """Sets up the global logging configuration."""
    root_logger = logging.getLogger()
    
    # Remove existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    # Set base level
    numeric_level = getattr(logging, log_level.upper(), logging.INFO)
    root_logger.setLevel(numeric_level)

    # Create handler
    console_handler = logging.StreamHandler(sys.stdout)

    if environment.lower() == "production":
        console_handler.setFormatter(StructuredJsonFormatter())
    else:
        # User-friendly format for local development
        console_formatter = logging.Formatter(
            fmt="%(asctime)s [%(levelname)s] [%(name)s] [TraceID: %(correlation_id)s] - %(message)s"
        )
        
        # We need a custom way to inject the correlation ID context var in local dev text logs too
        class DevConsoleFormatter(logging.Formatter):
            def format(self, record: logging.LogRecord) -> str:
                record.correlation_id = correlation_id_ctx.get("-")
                return super().format(record)

        console_handler.setFormatter(
            DevConsoleFormatter(
                fmt="%(asctime)s [%(levelname)s] [%(name)s] [TraceID: %(correlation_id)s] - %(message)s"
            )
        )

    root_logger.addHandler(console_handler)

    # Specific configurations for noisy libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.error").setLevel(logging.INFO)


def get_logger(name: str) -> logging.Logger:
    """Returns a logger with the given name."""
    return logging.getLogger(name)
