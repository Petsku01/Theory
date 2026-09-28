# Logpoint Compliance Monitoring Queries

This README provides a collection of commonly used Logpoint queries for compliance monitoring, designed to help organizations meet regulatory requirements (e.g., GDPR, HIPAA, PCI DSS) by tracking user activity, data access, and configuration changes. Each query includes a description, visualization details, and customization tips to adapt to your environment.

## 1. User Data Access Monitoring

**Purpose**: Tracks access to sensitive data to ensure compliance with data protection regulations (e.g., GDPR, HIPAA).

**Query**:
```
norm_id=* event_type=access | search "file OR database OR share" | chart count by user, object over 1h
```

**Description**:
- Targets access events across all normalized log sources (`norm_id=*`, `event_type=access`).
- Filters for access to files, databases, or network shares.
- Counts occurrences by user and accessed object (e.g., file or database table) over the last hour.
- Useful for auditing access to sensitive data.

**Visualization**:
- **Type**: Bar chart
- **X-Axis**: `user`
- **Y-Axis**: Event count
- **Legend**: `object`
- **Title**: User Data Access by User and Object (Last 1 Hour)

**Customization**:
- Narrow `norm_id` (e.g., `norm_id=Windows` or `norm_id=Database`) to reduce query load and improve performance.
- Verify `event_type=access`, `user`, and `object` field names (e.g., `username`, `file_name`, `table_name`) in your Logpoint schema.
- Add specific keywords (e.g., `search "confidential OR personal"`) for sensitive data.
- Adjust timeframe (e.g., `over 24h`) for compliance reporting.

## 2. Configuration Change Monitoring

**Purpose**: Monitors system or application configuration changes to ensure compliance with change management policies (e.g., PCI DSS).

**Query**:
```
norm_id=* event_type IN ["config_change", "modification"] | chart count by hostname, event_source over 1h
```

**Description**:
- Targets configuration change events across all log sources (`norm_id=*`, `event_type IN ["config_change", "modification"]`).
- Counts changes by hostname and event source over the last hour.
- Helps audit unauthorized or unapproved configuration changes.

**Visualization**:
- **Type**: Bar chart
- **X-Axis**: `hostname`
- **Y-Axis**: Event count
- **Legend**: `event_source`
- **Title**: Configuration Changes by Hostname and Event Source (Last 1 Hour)

**Customization**:
- Narrow `norm_id` (e.g., `norm_id=Windows` or `norm_id=Firewall`) for specific systems.
- Verify `event_type` values (e.g., `config_change`, `modification`) and field names (`hostname`, `event_source`) in your schema.
- Filter by specific change types (e.g., `search "registry OR policy"`) for targeted monitoring.
- Use `over 24h` for daily compliance reports.

## 3. Account Management Activity

**Purpose**: Tracks account creation, deletion, or modification to ensure compliance with access control policies.

**Query**:
```
norm_id=Windows event_type IN ["user_created", "user_deleted", "user_modified"] | chart count by user, event_type over 1h
```

**Description**:
- Targets Windows logs for account management events (`event_type IN ["user_created", "user_deleted", "user_modified"]`).
- Counts events by user and event type over the last hour.
- Useful for auditing account changes (e.g., PCI DSS Requirement 8).

**Visualization**:
- **Type**: Bar chart
- **X-Axis**: `user`
- **Y-Axis**: Event count
- **Legend**: `event_type`
- **Title**: Account Management Activity by User and Event Type (Last 1 Hour)

**Customization**:
- Replace `norm_id=Windows` with `norm_id=Syslog` for Linux or other systems.
- Verify `event_type` values (e.g., `user_created`, `user_deleted`) and `user` field name in your schema. For Windows, consider adding `event_id IN [4720, 4726, 4738]` for specific account events.
- Adjust timeframe (e.g., `over 24h`) for compliance audits.

## 4. Audit Log Tampering Detection

**Purpose**: Detects attempts to clear or modify audit logs, which could indicate non-compliance or malicious activity.

**Query**:
```
norm_id=Windows event_type=audit_log | search "clear OR tamper OR modify" | chart count by hostname, user over 1h
```

**Description**:
- Targets Windows audit log events (`norm_id=Windows`, `event_type=audit_log`).
- Filters for actions like clearing or modifying logs.
- Counts occurrences by hostname and user over the last hour.
- Helps ensure audit log integrity (e.g., GDPR Article 32).

**Visualization**:
- **Type**: Bar chart
- **X-Axis**: `hostname`
- **Y-Axis**: Event count
- **Legend**: `user`
- **Title**: Audit Log Tampering Events by Hostname and User (Last 1 Hour)

**Customization**:
- Replace `norm_id=Windows` with `norm_id=Syslog` for Linux or other systems.
- Verify `event_type=audit_log` and field names (`hostname`, `user`) in your schema. For Windows, consider adding `event_id=1102` for log clearing events.
- Add specific keywords (e.g., `search "delete OR overwrite"`) for broader detection.
- Adjust timeframe (e.g., `over 24h`) for compliance reporting.

## Tips for Using Queries

- **Performance**: Narrow `norm_id` or `event_source` to reduce query load (e.g., `norm_id=Windows`). For large environments, avoid broad queries like `norm_id=*` to prevent performance issues.
- **Timeframes**: Adjust `over` clause (e.g., `over 6h`, `over 24h`) for different monitoring periods or compliance reporting needs.
- **Alerts**: Convert queries to alerts in Logpoint by adding thresholds (e.g., `count > 5`) for immediate compliance violation notifications.
- **Dashboards**: Save queries to Logpoint dashboards for real-time compliance monitoring.
- **Advanced Features**: Use `| correlate` to link related events (e.g., user access with configuration changes) or `| anomaly` for machine learning-based anomaly detection.

### Creating Alerts and Dashboards
- **Alerts**: In Logpoint, add a condition like `count > 5` to a query and save it as an alert for proactive compliance notifications.
- **Dashboards**: Use Logpoint’s dashboard feature to add these queries as widgets for real-time visualization and audit reporting.

## Example Chart Configuration (User Data Access Monitoring)

For the user data access query, the following Chart.js configuration can be used to visualize results in a custom dashboard:

```chartjs
{
  "type": "bar",
  "data": {
    "labels": [],
    "datasets": [
      {
        "label": "Data Access by Object",
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
        "text": "User Data Access by User and Object (Last 1 Hour)"
      }
    }
  }
}
```

- This chart is a template. Actual `data` and `labels` must be populated with query results from Logpoint (e.g., unique `user` values for labels and counts for data). For `object` grouping, consider a stacked bar chart.

## Next Steps

- Customize queries based on your environment (e.g., specific systems, users, or compliance requirements).
- Integrate with Logpoint dashboards or alerting for continuous compliance monitoring.
- Contact your Logpoint administrator for assistance with advanced configurations or data source setup.

For more information, refer to the [Logpoint Documentation](https://docs.logpoint.com/).