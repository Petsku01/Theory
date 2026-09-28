# Logpoint Application Performance Monitoring Queries

This README provides a collection of commonly used Logpoint queries for monitoring application performance, designed to help IT teams track application health, detect errors, and optimize performance. These queries focus on web server errors, response times, and database performance. Each query includes a description, visualization details, and customization tips to adapt to your environment.

## 1. Web Server HTTP Errors (Apache/NGINX)

**Purpose**: Detects HTTP errors (e.g., 404, 500) to identify issues in web applications.

**Query**:
```
norm_id=Application event_source IN ["Apache", "NGINX"] | search "status=404 OR status=500" | chart count by url, status over 1h
```

**Description**:
- Targets web server logs (Apache or NGINX) under `norm_id=Application`.
- Filters for HTTP 404 (Not Found) or 500 (Internal Server Error) status codes.
- Counts occurrences by URL and status code over the last hour.
- Useful for identifying broken links, server errors, or misconfigured endpoints.

**Visualization**:
- **Type**: Bar chart
- **X-Axis**: `url`
- **Y-Axis**: Event count
- **Legend**: `status`
- **Title**: HTTP Errors by URL and Status Code (Last 1 Hour)

**Customization**:
- Add other status codes (e.g., `status=503`) for broader error detection.
- Replace `event_source IN ["Apache", "NGINX"]` with specific sources (e.g., `event_source=Apache`) if needed.
- Verify `url` and `status` field names in your Logpoint schema (e.g., `request_url`, `status_code`).
- Adjust timeframe (e.g., `over 6h`) for trend analysis.

## 2. Web Application Response Time

**Purpose**: Monitors web application response times to detect performance degradation.

**Query**:
```
norm_id=Application event_source IN ["Apache", "NGINX"] | chart avg(response_time) by url over 1h
```

**Description**:
- Targets Apache or NGINX logs under `norm_id=Application`.
- Calculates average response time per URL over the last hour.
- Helps identify slow endpoints or performance bottlenecks.

**Visualization**:
- **Type**: Line chart
- **X-Axis**: Time
- **Y-Axis**: Average response time (ms)
- **Legend**: `url`
- **Title**: Average Response Time by URL (Last 1 Hour)

**Customization**:
- Verify `response_time` field name (e.g., `time_taken`, `latency`) in your schema.
- Use `max(response_time)` for peak performance analysis.
- Filter by specific URLs (e.g., `url="/api/*"`) for targeted monitoring.
- Adjust timeframe (e.g., `over 24h`) for daily trends.

## 3. Database Query Performance

**Purpose**: Tracks slow database queries to optimize database performance.

**Query**:
```
norm_id=Database event_source IN ["MySQL", "PostgreSQL"] | search "duration>1000" | chart count by query over 1h
```

**Description**:
- Targets MySQL or PostgreSQL logs under `norm_id=Database`.
- Filters for queries with duration greater than 1000ms (1 second).
- Counts occurrences by query over the last hour.
- Useful for identifying slow or inefficient database queries.

**Visualization**:
- **Type**: Bar chart
- **X-Axis**: `query`
- **Y-Axis**: Event count
- **Title**: Slow Database Queries (Duration > 1s) by Query (Last 1 Hour)

**Customization**:
- Adjust the duration threshold (e.g., `duration>500`) for stricter or looser filtering.
- Verify `duration` and `query` field names (e.g., `query_time`, `sql`) in your schema.
- Replace `event_source IN ["MySQL", "PostgreSQL"]` with specific database types.
- Use `over 24h` for longer-term analysis.

## 4. Application Error Logs

**Purpose**: Monitors application logs for errors or exceptions to detect application issues.

**Query**:
```
norm_id=Application | search "error OR exception OR failed" | chart count by event_source, message over 1h
```

**Description**:
- Searches all application logs (`norm_id=Application`) for keywords indicating issues (`error`, `exception`, `failed`).
- Counts occurrences by event source and message over the last hour.
- Helps identify recurring errors or exceptions in applications.

**Visualization**:
- **Type**: Bar chart
- **X-Axis**: `event_source`
- **Y-Axis**: Event count
- **Legend**: `message`
- **Title**: Application Errors by Event Source and Message (Last 1 Hour)

**Customization**:
- Narrow `norm_id` or `event_source` (e.g., `event_source=JavaApp`) to reduce query load.
- Add specific error keywords (e.g., `NullPointerException`, `timeout`) for targeted detection.
- Verify `message` field name (e.g., `log_message`, `description`) in your schema.
- Adjust timeframe (e.g., `over 6h`) for broader analysis.

## Tips for Using Queries

- **Performance**: Narrow `norm_id` or `event_source` to reduce query load (e.g., `norm_id=Application event_source=Apache`). For large environments, avoid broad queries like `norm_id=*` to prevent performance issues.
- **Timeframes**: Adjust `over` clause (e.g., `over 6h`, `over 24h`) for different monitoring periods.
- **Alerts**: Convert queries to alerts in Logpoint by adding thresholds (e.g., `count > 10`, `avg(response_time) > 500`).
- **Dashboards**: Save queries to Logpoint dashboards for real-time monitoring.
- **Advanced Features**: Use `| correlate` to link related events (e.g., HTTP errors with slow database queries) or `| anomaly` for machine learning-based anomaly detection.

### Creating Alerts and Dashboards
- **Alerts**: In Logpoint, add a condition like `count > 10` or `avg(response_time) > 500` to a query and save it as an alert for proactive notifications.
- **Dashboards**: Use Logpoint’s dashboard feature to add these queries as widgets for real-time visualization.

## Example Chart Configuration (Web Server HTTP Errors)

For the web server HTTP errors query, the following Chart.js configuration can be used to visualize results in a custom dashboard:

```chartjs
{
  "type": "bar",
  "data": {
    "labels": [],
    "datasets": [
      {
        "label": "HTTP Errors by Status",
        "data": [],
        "backgroundColor": ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0"],
        "borderColor": ["#D8576A", "#2A8BBF", "#D8A847", "#3B9C9C"],
        "borderWidth": 1
      }
    ]
  },
  "options": {
    "scales": {
      "y": {
        "beginAtZero": true,
        "title": {
          "display": true,
          "text": "Event Count"
        }
      },
      "x": {
        "title": {
          "display": true,
          "text": "URL"
        }
      }
    },
    "plugins": {
      "legend": {
        "display": true
      },
      "title": {
        "display": true,
        "text": "HTTP Errors by URL and Status Code (Last 1 Hour)"
      }
    }
  }
}
```

- This chart is a template. Actual `data` and `labels` must be populated with query results from Logpoint (e.g., unique `url` values for labels and counts for data). For `status` grouping, consider a stacked bar chart.

## Next Steps

- Customize queries based on your environment (e.g., specific applications, URLs, or timeframes).
- Integrate with Logpoint dashboards or alerting for continuous application monitoring.
- Contact your Logpoint administrator for assistance with advanced configurations or data source setup.

For more information, refer to the [Logpoint Documentation](https://docs.logpoint.com/).