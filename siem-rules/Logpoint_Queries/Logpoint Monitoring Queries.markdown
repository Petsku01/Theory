# Logpoint Monitoring Queries

This README provides a collection of commonly used Logpoint queries for monitoring system health, network activity, and application performance. These queries are designed to help IT operations teams track errors, performance metrics, and potential issues across various systems. Each query includes a description and example visualization.

## 1. System Health Monitoring (Errors and Warnings)

**Purpose**: Detects errors, warnings, or critical events across all systems to identify problematic hosts.

**Query**:
```
norm_id=* event_source=* | search "error OR warning OR critical" | chart count by hostname, event_type over 1h
```

**Description**:
- Captures logs from all normalized sources (`norm_id=*`) and event sources (`event_source=*`).
- Filters for keywords indicating issues (`error`, `warning`, `critical`).
- Aggregates counts by hostname and event type over the last hour.
- Useful for identifying systems with recurring issues.

**Visualization**:
- **Type**: Bar chart
- **X-Axis**: `hostname`
- **Y-Axis**: Event count
- **Legend**: `event_type`
- **Title**: System Errors/Warnings by Hostname (Last 1 Hour)

**Customization**:
- Narrow scope with `norm_id=Linux` or `event_source=Apache`.
- Adjust timeframe (e.g., `over 24h`) for trend analysis.

## 2. CPU and Memory Usage Monitoring

**Purpose**: Monitors system resource usage (CPU/memory) to detect performance bottlenecks.

**Query**:
```
norm_id=Syslog | search "cpu OR memory" | chart avg(cpu_usage) by hostname over 1h
```

**Description**:
- Targets Syslog logs containing CPU or memory data.
- Calculates average CPU usage per hostname over the last hour.
- Helps identify overutilized systems.

**Visualization**:
- **Type**: Line chart
- **X-Axis**: Time
- **Y-Axis**: Average CPU usage
- **Legend**: `hostname`
- **Title**: Average CPU Usage by Hostname (Last 1 Hour)

**Customization**:
- Replace `cpu_usage` with `memory_usage` for memory monitoring.
- Use `max(cpu_usage)` for peak usage.

## 3. Network Traffic Monitoring

**Purpose**: Tracks network traffic to identify unusual activity or high-bandwidth usage.

**Query**:
```
norm_id=Firewall event_type=traffic | chart sum(bytes) by src_ip over 1h
```

**Description**:
- Focuses on firewall logs with `event_type=traffic`.
- Sums total bytes transferred per source IP over the last hour.
- Useful for detecting potential network anomalies.

**Visualization**:
- **Type**: Bar chart
- **X-Axis**: `src_ip`
- **Y-Axis**: Total bytes
- **Title**: Network Traffic by Source IP (Last 1 Hour)

**Customization**:
- Filter by `dst_ip` or `port` for specific traffic analysis.
- Use `over 24h` for daily trends.

## 4. Application Error Monitoring

**Purpose**: Monitors application logs for HTTP errors (e.g., 404, 500) to detect issues.

**Query**:
```
norm_id=Application event_source=Apache | search "500 OR 404" | chart count by url over 1h
```

**Description**:
- Targets Apache logs under the Application normalization.
- Filters for HTTP 404 (Not Found) or 500 (Server Error) status codes.
- Counts occurrences by URL over the last hour.

**Visualization**:
- **Type**: Bar chart
- **X-Axis**: `url`
- **Y-Axis**: Event count
- **Title**: HTTP Errors by URL (Last 1 Hour)

**Customization**:
- Add other status codes (e.g., `503`) to the search.
- Replace `event_source=Apache` with `event_source=NGINX` for other web servers.

## Tips for Using Queries

- **Performance**: Narrow `norm_id` or `event_source` to reduce query load (e.g., `norm_id=Windows`).
- **Timeframes**: Adjust `over` clause (e.g., `over 6h`, `over 24h`) for different monitoring periods.
- **Alerts**: Convert queries to alerts in Logpoint by adding thresholds (e.g., `count > 10`).
- **Dashboards**: Save queries to Logpoint dashboards for real-time monitoring.
- **Advanced Features**: Use `| correlate` for event correlation or `| anomaly` for machine learning-based anomaly detection.

## Example Chart Configuration (System Health Query)

For the system health query, the following Chart.js configuration can be used to visualize results in a custom dashboard:

```chartjs
{
  "type": "bar",
  "data": {
    "labels": ["hostname"],
    "datasets": [
      {
        "label": "Event Count by Type",
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
          "text": "Hostname"
        }
      }
    },
    "plugins": {
      "legend": {
        "display": true
      },
      "title": {
        "display": true,
        "text": "System Errors/Warnings by Hostname (Last 1 Hour)"
      }
    }
  }
}
```

## Next Steps

- Customize queries based on your environment (e.g., specific servers, applications, or timeframes).
- Integrate with Logpoint dashboards or alerting for continuous monitoring.
- Contact your Logpoint administrator for assistance with advanced configurations or data source setup.

For more information, refer to the [Logpoint Documentation](https://docs.logpoint.com/).