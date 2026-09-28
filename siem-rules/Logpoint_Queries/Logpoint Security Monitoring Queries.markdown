# Logpoint Security Monitoring Queries

This README provides a collection of commonly used Logpoint queries for security monitoring, designed to help security teams detect threats, suspicious activities, and potential incidents. Each query includes a description, visualization details, and customization tips to adapt to your environment. These queries focus on areas like failed logins, firewall denials, and malware detection.

## 1. Failed Login Attempts (Brute Force Detection)

**Purpose**: Detects potential brute-force attacks by identifying repeated failed login attempts.

**Query**:
```
norm_id=Windows event_type=authentication | search "fail OR denied" | chart count by user, src_ip over 1h
```

**Description**:
- Targets Windows authentication logs (`norm_id=Windows`, `event_type=authentication`).
- Filters for failed login events (`fail OR denied`).
- Counts occurrences by user and source IP over the last hour.
- Useful for identifying brute-force attempts or compromised accounts.

**Visualization**:
- **Type**: Bar chart
- **X-Axis**: `user`
- **Y-Axis**: Event count
- **Legend**: `src_ip`
- **Title**: Failed Login Attempts by User and Source IP (Last 1 Hour)

**Customization**:
- Replace `norm_id=Windows` with `norm_id=Syslog` for Linux or other systems.
- Adjust timeframe (e.g., `over 6h`) for broader analysis.
- Add `count > 10` to filter for high-frequency attempts.
- Verify `user` and `src_ip` field names in your Logpoint schema.

## 2. Firewall Deny Events (Suspicious Network Activity)

**Purpose**: Monitors firewall logs for denied connections, indicating potential unauthorized access or scanning.

**Query**:
```
norm_id=Firewall event_type=deny | chart count by src_ip, dst_ip over 1h
```

**Description**:
- Focuses on firewall logs with `event_type=deny`.
- Counts denied connections by source and destination IP over the last hour.
- Helps detect port scanning, unauthorized access attempts, or misconfigured systems.

**Visualization**:
- **Type**: Bar chart
- **X-Axis**: `src_ip`
- **Y-Axis**: Event count
- **Legend**: `dst_ip`
- **Title**: Firewall Deny Events by Source and Destination IP (Last 1 Hour)

**Customization**:
- Filter by specific ports (e.g., `port=22`) for targeted monitoring.
- Confirm `event_type=deny` and field names (`src_ip`, `dst_ip`) match your firewall’s normalized fields.
- Use `over 24h` for daily trends.

## 3. Malware or Suspicious Activity Detection

**Purpose**: Identifies logs containing indicators of malware or suspicious behavior.

**Query**:
```
norm_id=* | search "malware OR virus OR suspicious OR exploit" | chart count by hostname, event_source over 1h
```

**Description**:
- Searches all normalized log sources (`norm_id=*`) for keywords like `malware`, `virus`, `suspicious`, or `exploit`.
- Aggregates counts by hostname and event source over the last hour.
- Useful for detecting potential infections or malicious activities.

**Visualization**:
- **Type**: Bar chart
- **X-Axis**: `hostname`
- **Y-Axis**: Event count
- **Legend**: `event_source`
- **Title**: Suspicious Activity by Hostname and Event Source (Last 1 Hour)

**Customization**:
- For large environments, narrow `norm_id` (e.g., `norm_id=Antivirus`) to avoid performance issues.
- Add specific indicators (e.g., `search "ransomware OR trojan"`) for targeted detection.
- Verify field names (`hostname`, `event_source`) in your Logpoint schema.

## 4. Privileged Account Activity

**Purpose**: Monitors activities from privileged accounts to detect unauthorized or suspicious actions.

**Query**:
```
norm_id=Windows event_type=authentication | search "success" user IN ["admin", "root", "administrator"] | chart count by user, src_ip over 1h
```

**Description**:
- Targets successful Windows authentication events for privileged accounts (`user IN ["admin", "root", "administrator"]`).
- Counts events by user and source IP over the last hour.
- Helps detect misuse of privileged accounts or unusual login locations.

**Visualization**:
- **Type**: Bar chart
- **X-Axis**: `user`
- **Y-Axis**: Event count
- **Legend**: `src_ip`
- **Title**: Privileged Account Activity by User and Source IP (Last 1 Hour)

**Customization**:
- Update the `user IN` list with your organization’s privileged account names.
- Replace `norm_id=Windows` with `norm_id=Syslog` for Linux environments.
- Verify `user` and `src_ip` field names in your schema.

## Tips for Using Queries

- **Performance**: Narrow `norm_id` or `event_source` to reduce query load (e.g., `norm_id=Windows`). For large environments, avoid broad queries like `norm_id=*` to prevent performance issues.
- **Timeframes**: Adjust `over` clause (e.g., `over 6h`, `over 24h`) for different monitoring periods.
- **Alerts**: Convert queries to alerts in Logpoint by adding thresholds (e.g., `count > 10`).
- **Dashboards**: Save queries to Logpoint dashboards for real-time monitoring.
- **Advanced Features**: Use `| correlate` for event correlation or `| anomaly` for machine learning-based anomaly detection.

### Creating Alerts and Dashboards
- **Alerts**: In Logpoint, add a condition like `count > 10` to a query and save it as an alert for proactive notifications.
- **Dashboards**: Use Logpoint’s dashboard feature to add these queries as widgets for real-time visualization.

## Example Chart Configuration (Failed Login Attempts)

For the failed login attempts query, the following Chart.js configuration can be used to visualize results in a custom dashboard:

```chartjs
{
  "type": "bar",
  "data": {
    "labels": [],
    "datasets": [
      {
        "label": "Failed Logins by Source IP",
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
          "text": "User"
        }
      }
    },
    "plugins": {
      "legend": {
        "display": true
      },
      "title": {
        "display": true,
        "text": "Failed Login Attempts by User and Source IP (Last 1 Hour)"
      }
    }
  }
}
```

- This chart is a template. Actual `data` and `labels` must be populated with query results from Logpoint (e.g., unique `user` values for labels and counts for data).

## Next Steps

- Customize queries based on your environment (e.g., specific accounts, IPs, or timeframes).
- Integrate with Logpoint dashboards or alerting for continuous security monitoring.
- Contact your Logpoint administrator for assistance with advanced configurations or data source setup.

For more information, refer to the [Logpoint Documentation](https://docs.logpoint.com/).