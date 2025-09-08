# Network Design Tool

## Overview
The Network Design Tool is a web-based application for designing and visualizing network topologies. It allows users to create, edit, and manage network diagrams by adding nodes (routers, switches, computers, servers), connecting them, and configuring their properties. The tool includes features for saving, loading, and exporting network designs.

## Features
- **Node Creation**: Add routers, switches, computers, or servers to the canvas.
- **Connections**: Create connections between nodes to represent network links.
- **Node Properties**: Configure node details such as type, name, IP address, and description.
- **Canvas Interaction**: Select, connect, delete, or clear nodes and connections.
- **Export Capabilities**: Save and load network designs for future use.
- **Status Indicators**: Displays real-time information about the number of nodes, connections, and current mode.
- **Keyboard Shortcuts**:
  - `ESC`: Cancel current action.
  - `DEL`: Delete selected node or connection.
  - Right-click: Open node properties for editing.

## Usage
1. **Access the Tool**: Open `network-design-tool.html` in a web browser.
2. **Add Nodes**:
   - Click buttons like "Add Router," "Add Switch," "Add Computer," or "Add Server" to place nodes on the canvas.
3. **Connect Nodes**:
   - Select the "Connect" mode, then click two nodes to create a link between them.
4. **Edit Properties**:
   - Right-click a node to open the "Node Properties" dialog.
   - Set the node type, name, IP address, and optional description.
   - Click "Save Changes" to apply updates.
5. **Manage Diagram**:
   - Use "Select" mode to move or interact with nodes.
   - Click "Delete" to remove selected nodes or connections.
   - Use "Clear All" to reset the canvas.
   - Save or load designs using the "Save" and "Load" buttons.
6. **Monitor Status**:
   - The status bar shows the current mode, node count, connection count, and available shortcuts.

## File Structure
- `network-design-tool.html`: The main HTML file containing the tool's interface and functionality.

## Requirements
- A modern web browser (e.g., Chrome, Firefox, Edge).
- No additional dependencies or server setup required, as the tool runs client-side.

## Installation
1. Download or clone the repository containing `network-design-tool.html`.
2. Open the file in a web browser to start using the tool.

## Notes
- Ensure the IP address entered in the node properties follows a valid format (e.g., `192.168.1.1`).
- The tool does not currently support external file imports for images or additional resources.
- Future updates may include enhanced export formats or additional node types.

## Support
For issues or feature requests, please contact the developer or submit an issue on the project's repository (if applicable).