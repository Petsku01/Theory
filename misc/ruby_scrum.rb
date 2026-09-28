# Kill me
# Why does this not work?
# NOT FIXED

require 'tk'
require 'json'
require 'date'

# Files for persistent storage
TASK_FILE = "scrum_tasks.json"
SPRINT_FILE = "scrum_sprints.json"
USER_FILE = "scrum_users.json"

class Task
  attr_accessor :id, :title, :description, :status, :assignee, :story_points, :sprint_id, :history

  def initialize(id, title, description, status = "To Do", assignee = nil, story_points = 0, sprint_id = nil)
    @id = id
    @title = title
    @description = description
    @status = status
    @assignee = assignee
    @story_points = story_points
    @sprint_id = sprint_id
    @history = [{ event: "Created", timestamp: Time.now.to_s }]
  end

  def to_hash
    { id: @id, title: @title, description: @description, status: @status,
      assignee: @assignee, story_points: @story_points, sprint_id: @sprint_id, history: @history }
  end

  def add_history(event)
    @history << { event: event, timestamp: Time.now.to_s }
  end
end

class Sprint
  attr_accessor :id, :name, :start_date, :end_date

  def initialize(id, name, start_date, end_date)
    @id = id
    @name = name
    @start_date = start_date
    @end_date = end_date
  end

  def to_hash
    { id: @id, name: @name, start_date: @start_date.to_s, end_date: @end_date.to_s }
  end
end

class User
  attr_accessor :id, :name, :email

  def initialize(id, name, email)
    @id = id
    @name = name
    @email = email
  end

  def to_hash
    { id: @id, name: @name, email: @email }
  end
end

class ScrumBoard
  STATUSES = ["To Do", "In Progress", "Done"]

  def initialize
    @tasks = []
    @sprints = []
    @users = []
    @next_task_id = 1
    @next_sprint_id = 1
    @next_user_id = 1
    load_data
  end

  def load_data
    if File.exist?(TASK_FILE)
      File.open(TASK_FILE, "r") { |f| @tasks = JSON.parse(f.read).map { |d| Task.new(d["id"], d["title"], d["description"], d["status"], d["assignee"], d["story_points"], d["sprint_id"]).tap { |t| t.history = d["history"] } } }
      @next_task_id = [@tasks.map(&:id).max.to_i + 1, @next_task_id].max
    end
    if File.exist?(SPRINT_FILE)
      File.open(SPRINT_FILE, "r") { |f| @sprints = JSON.parse(f.read).map { |d| Sprint.new(d["id"], d["name"], Date.parse(d["start_date"]), Date.parse(d["end_date"])) } }
      @next_sprint_id = [@sprints.map(&:id).max.to_i + 1, @next_sprint_id].max
    end
    if File.exist?(USER_FILE)
      File.open(USER_FILE, "r") { |f| @users = JSON.parse(f.read).map { |d| User.new(d["id"], d["name"], d["email"]) } }
      @next_user_id = [@users.map(&:id).max.to_i + 1, @next_user_id].max
    end
  end

  def save_data
    File.open(TASK_FILE, "w") { |f| f.write(JSON.pretty_generate(@tasks.map(&:to_hash))) }
    File.open(SPRINT_FILE, "w") { |f| f.write(JSON.pretty_generate(@sprints.map(&:to_hash))) }
    File.open(USER_FILE, "w") { |f| f.write(JSON.pretty_generate(@users.map(&:to_hash))) }
  end

  def add_task(title, description, assignee, story_points, sprint_id)
    return "Title is required" if title.empty?
    return "Story points must be non-negative" if story_points < 0
    return "Invalid sprint ID" if sprint_id && !@sprints.find { |s| s.id == sprint_id }
    return "Invalid assignee" if assignee && !@users.find { |u| u.name == assignee }
    task = Task.new(@next_task_id, title, description, "To Do", assignee, story_points, sprint_id)
    @tasks << task
    @next_task_id += 1
    save_data
    nil
  end

  def update_task(id, title, description, status, assignee, story_points, sprint_id)
    task = @tasks.find { |t| t.id == id }
    return "Task not found" unless task
    return "Title cannot be empty" if title.strip.empty?
    return "Invalid status" unless STATUSES.include?(status)
    return "Story points must be non-negative" if story_points < 0
    return "Invalid sprint ID" if sprint_id && !@sprints.find { |s| s.id == sprint_id }
    return "Invalid assignee" if assignee && !@users.find { |u| u.name == assignee }
    task.title = title unless title.empty?
    task.description = description unless description.empty?
    if task.status != status
      task.add_history("Status changed to #{status}")
      task.status = status
    end
    task.assignee = assignee.empty? ? nil : assignee
    if task.story_points != story_points
      task.add_history("Story points changed to #{story_points}")
      task.story_points = story_points
    end
    if task.sprint_id != sprint_id
      task.add_history("Sprint changed to #{sprint_id || 'None'}")
      task.sprint_id = sprint_id
    end
    save_data
    nil
  end

  def delete_task(id)
    return "Task not found" unless @tasks.find { |t| t.id == id }
    @tasks.reject! { |t| t.id == id }
    save_data
    nil
  end

  def add_sprint(name, start_date, end_date)
    return "Name is required" if name.empty?
    return "Invalid date format" unless start_date.is_a?(Date) && end_date.is_a?(Date)
    return "Start date must be before end date" if start_date > end_date
    sprint = Sprint.new(@next_sprint_id, name, start_date, end_date)
    @sprints << sprint
    @next_sprint_id += 1
    save_data
    nil
  end

  def delete_sprint(id)
    return "Sprint not found" unless @sprints.find { |s| s.id == id }
    return "Sprint has tasks" if @tasks.any? { |t| t.sprint_id == id }
    @sprints.reject! { |s| s.id == id }
    save_data
    nil
  end

  def add_user(name, email)
    return "Name is required" if name.empty?
    return "Invalid email format" unless email.match?(/\A[\w+\-.]+@[a-z\d\-.]+\.[a-z]+\z/i)
    return "User already exists" if @users.any? { |u| u.email == email }
    user = User.new(@next_user_id, name, email)
    @users << user
    @next_user_id += 1
    save_data
    nil
  end

  def delete_user(id)
    user = @users.find { |u| u.id == id }
    return "User not found" unless user
    return "User is assigned to tasks" if @tasks.any? { |t| t.assignee == user.name }
    @users.reject! { |u| u.id == id }
    save_data
    nil
  end

  def burndown_data(sprint_id)
    sprint = @sprints.find { |s| s.id == sprint_id }
    return [] unless sprint
    days = (sprint.start_date..sprint.end_date).to_a
    data = []
    total_points = @tasks.select { |t| t.sprint_id == sprint_id }.sum(&:story_points)
    days.each do |day|
      completed_points = @tasks.select { |t| t.sprint_id == sprint_id && t.status == "Done" &&
        t.history.any? { |h| h["event"] == "Status changed to Done" && Date.parse(h["timestamp"]) <= day } }.sum(&:story_points)
      data << { date: day.to_s, remaining_points: total_points - completed_points }
    end
    data
  end

  attr_reader :tasks, :sprints, :users
end

class ScrumGUI
  def initialize
    @board = ScrumBoard.new
    @root = TkRoot.new { title "Scrum Board" }
    @root.geometry("1200x800")
    build_gui
  end

  def build_gui
    # Notebook for tabs
    notebook = Tk::Tile::Notebook.new(@root).pack(fill: :both, expand: true, padx: 10, pady: 10)

    # Task Management Tab
    task_frame = TkFrame.new(notebook)
    notebook.add(task_frame, text: "Tasks")
    build_task_tab(task_frame)

    # Sprint Management Tab
    sprint_frame = TkFrame.new(notebook)
    notebook.add(sprint_frame, text: "Sprints")
    build_sprint_tab(sprint_frame)

    # User Management Tab
    user_frame = TkFrame.new(notebook)
    notebook.add(user_frame, text: "Users")
    build_user_tab(user_frame)
  end

  def build_task_tab(frame)
    # Input frame
    input_frame = TkFrame.new(frame).pack(side: :top, fill: :x, padx: 10, pady: 10)
    TkLabel.new(input_frame) { text "Title:" }.grid(row: 0, column: 0, sticky: 'e')
    @task_title = TkEntry.new(input_frame).grid(row: 0, column: 1, padx: 5)
    TkLabel.new(input_frame) { text "Description:" }.grid(row: 0, column: 2, sticky: 'e')
    @task_desc = TkEntry.new(input_frame).grid(row: 0, column: 3, padx: 5)
    TkLabel.new(input_frame) { text "Assignee:" }.grid(row: 1, column: 0, sticky: 'e')
    @task_assignee = TkEntry.new(input_frame).grid(row: 1, column: 1, padx: 5)
    TkLabel.new(input_frame) { text "Story Points:" }.grid(row: 1, column: 2, sticky: 'e')
    @task_points = TkEntry.new(input_frame).grid(row: 1, column: 3, padx: 5)
    TkLabel.new(input_frame) { text "Status:" }.grid(row: 2, column: 0, sticky: 'e')
    @task_status = TkVariable.new("To Do")
    TkOptionMenu.new(input_frame, @task_status, *ScrumBoard::STATUSES).grid(row: 2, column: 1, padx: 5)
    TkLabel.new(input_frame) { text "Sprint ID:" }.grid(row: 2, column: 2, sticky: 'e')
    @task_sprint = TkEntry.new(input_frame).grid(row: 2, column: 3, padx: 5)
    TkLabel.new(input_frame) { text "Task ID:" }.grid(row: 3, column: 0, sticky: 'e')
    @task_id = TkEntry.new(input_frame).grid(row: 3, column: 1, padx: 5)

    # Filter frame
    filter_frame = TkFrame.new(frame).pack(side: :top, fill: :x, padx: 10, pady: 5)
    TkLabel.new(filter_frame) { text "Filter by Sprint ID:" }.pack(side: :left)
    @filter_sprint = TkEntry.new(filter_frame).pack(side: :left, padx: 5)
    TkLabel.new(filter_frame) { text "Filter by Assignee:" }.pack(side: :left)
    @filter_assignee = TkEntry.new(filter_frame).pack(side: :left, padx: 5)
    TkButton.new(filter_frame) { text "Apply Filter"; command proc { refresh_task_display } }.pack(side: :left, padx: 5)

    # Buttons
    button_frame = TkFrame.new(frame).pack(side: :top, fill: :x, padx: 10, pady: 5)
    TkButton.new(button_frame) { text "Add Task"; command proc { add_task } }.pack(side: :left, padx: 5)
    TkButton.new(button_frame) { text "Update Task"; command proc { update_task } }.pack(side: :left, padx: 5)
    TkButton.new(button_frame) { text "Delete Task"; command proc { delete_task } }.pack(side: :left, padx: 5)
    TkButton.new(button_frame) { text "View Task Details"; command proc { view_task_details } }.pack(side: :left, padx: 5)
    TkButton.new(button_frame) { text "Export Burndown"; command proc { export_burndown } }.pack(side: :left, padx: 5)

    # Display frame
    @task_display = TkFrame.new(frame).pack(side: :top, fill: :both, expand: true, padx: 10, pady: 10)
    refresh_task_display
  end

  def build_sprint_tab(frame)
    input_frame = TkFrame.new(frame).pack(side: :top, fill: :x, padx: 10, pady: 10)
    TkLabel.new(input_frame) { text "Sprint Name:" }.grid(row: 0, column: 0, sticky: 'e')
    @sprint_name = TkEntry.new(input_frame).grid(row: 0, column: 1, padx: 5)
    TkLabel.new(input_frame) { text "Start Date (YYYY-MM-DD):" }.grid(row: 0, column: 2, sticky: 'e')
    @sprint_start = TkEntry.new(input_frame).grid(row: 0, column: 3, padx: 5)
    TkLabel.new(input_frame) { text "End Date (YYYY-MM-DD):" }.grid(row: 1, column: 0, sticky: 'e')
    @sprint_end = TkEntry.new(input_frame).grid(row: 1, column: 1, padx: 5)
    TkLabel.new(input_frame) { text "Sprint ID:" }.grid(row: 1, column: 2, sticky: 'e')
    @sprint_id = TkEntry.new(input_frame).grid(row: 1, column: 3, padx: 5)

    button_frame = TkFrame.new(frame).pack(side: :top, fill: :x, padx: 10, pady: 5)
    TkButton.new(button_frame) { text "Add Sprint"; command proc { add_sprint } }.pack(side: :left, padx: 5)
    TkButton.new(button_frame) { text "Delete Sprint"; command proc { delete_sprint } }.pack(side: :left, padx: 5)

    @sprint_display = TkFrame.new(frame).pack(side: :top, fill: :both, expand: true, padx: 10, pady: 10)
    refresh_sprint_display
  end

  def build_user_tab(frame)
    input_frame = TkFrame.new(frame).pack(side: :top, fill: :x, padx: 10, pady: 10)
    TkLabel.new(input_frame) { text "User Name:" }.grid(row: 0, column: 0, sticky: 'e')
    @user_name = TkEntry.new(input_frame).grid(row: 0, column: 1, padx: 5)
    TkLabel.new(input_frame) { text "Email:" }.grid(row: 0, column: 2, sticky: 'e')
    @user_email = TkEntry.new(input_frame).grid(row: 0, column: 3, padx: 5)
    TkLabel.new(input_frame) { text "User ID:" }.grid(row: 1, column: 0, sticky: 'e')
    @user_id = TkEntry.new(input_frame).grid(row: 1, column: 1, padx: 5)

    button_frame = TkFrame.new(frame).pack(side: :top, fill: :x, padx: 10, pady: 5)
    TkButton.new(button_frame) { text "Add User"; command proc { add_user } }.pack(side: :left, padx: 5)
    TkButton.new(button_frame) { text "Delete User"; command proc { delete_user } }.pack(side: :left, padx: 5)

    @user_display = TkFrame.new(frame).pack(side: :top, fill: :both, expand: true, padx: 10, pady: 10)
    refresh_user_display
  end

  def add_task
    error = @board.add_task(
      @task_title.get.strip,
      @task_desc.get.strip,
      @task_assignee.get.strip,
      @task_points.get.to_i,
      @task_sprint.get.empty? ? nil : @task_sprint.get.to_i
    )
    if error
      Tk.messageBox('type' => 'ok', 'title' => 'Error', 'message' => error)
    else
      clear_task_inputs
      refresh_task_display
      Tk.messageBox('type' => 'ok', 'title' => 'Success', 'message' => 'Task added!')
    end
  end

  def update_task
    id = @task_id.get.to_i
    return Tk.messageBox('type' => 'ok', 'title' => 'Error', 'message' => 'Valid Task ID required!') if id <= 0
    error = @board.update_task(
      id, @task_title.get.strip, @task_desc.get.strip, @task_status.value,
      @task_assignee.get.strip, @task_points.get.to_i, @task_sprint.get.empty? ? nil : @task_sprint.get.to_i
    )
    if error
      Tk.messageBox('type' => 'ok', 'title' => 'Error', 'message' => error)
    else
      clear_task_inputs
      refresh_task_display
      Tk.messageBox('type' => 'ok', 'title' => 'Success', 'message' => "Task #{id} updated!")
    end
  end

  def delete_task
    id = @task_id.get.to_i
    return Tk.messageBox('type' => 'ok', 'title' => 'Error', 'message' => 'Valid Task ID required!') if id <= 0
    error = @board.delete_task(id)
    if error
      Tk.messageBox('type' => 'ok', 'title' => 'Error', 'message' => error)
    else
      clear_task_inputs
      refresh_task_display
      Tk.messageBox('type' => 'ok', 'title' => 'Success', 'message' => "Task #{id} deleted!")
    end
  end

  def view_task_details
    id = @task_id.get.to_i
    task = @board.tasks.find { |t| t.id == id }
    return Tk.messageBox('type' => 'ok', 'title' => 'Error', 'message' => 'Task not found!') unless task
    dialog = TkToplevel.new(@root) { title "Task Details: #{task.id}" }
    TkLabel.new(dialog) { text "Title: #{task.title}" }.pack(pady: 5)
    TkLabel.new(dialog) { text "Description: #{task.description}" }.pack(pady: 5)
    TkLabel.new(dialog) { text "Status: #{task.status}" }.pack(pady: 5)
    TkLabel.new(dialog) { text "Assignee: #{task.assignee || 'None'}" }.pack(pady: 5)
    TkLabel.new(dialog) { text "Story Points: #{task.story_points}" }.pack(pady: 5)
    TkLabel.new(dialog) { text "Sprint ID: #{task.sprint_id || 'None'}" }.pack(pady: 5)
    TkLabel.new(dialog) { text "History:" }.pack(pady: 5)
    task.history.each { |h| TkLabel.new(dialog) { text "#{h[:timestamp]}: #{h[:event]}" }.pack(pady: 2) }
    TkButton.new(dialog) { text "Close"; command proc { dialog.destroy } }.pack(pady: 10)
  end

  def export_burndown
    sprint_id = @task_sprint.get.to_i
    return Tk.messageBox('type' => 'ok', 'title' => 'Error', 'message' => 'Valid Sprint ID required!') if sprint_id <= 0
    data = @board.burndown_data(sprint_id)
    return Tk.messageBox('type' => 'ok', 'title' => 'Error', 'message' => 'Sprint not found!') if data.empty?
    File.open("burndown_sprint_#{sprint_id}.csv", "w") do |f|
      f.puts "Date,Remaining Points"
      data.each { |d| f.puts "#{d[:date]},#{d[:remaining_points]}" }
    end
    Tk.messageBox('type' => 'ok', 'title' => 'Success', 'message' => "Burndown data exported to burndown_sprint_#{sprint_id}.csv!")
  end

  def add_sprint
    begin
      start_date = Date.parse(@sprint_start.get)
      end_date = Date.parse(@sprint_end.get)
    rescue ArgumentError
      Tk.messageBox('type' => 'ok', 'title' => 'Error', 'message' => 'Invalid date format!')
      return
    end
    error = @board.add_sprint(@sprint_name.get.strip, start_date, end_date)
    if error
      Tk.messageBox('type' => 'ok', 'title' => 'Error', 'message' => error)
    else
      clear_sprint_inputs
      refresh_sprint_display
      Tk.messageBox('type' => 'ok', 'title' => 'Success', 'message' => 'Sprint added!')
    end
  end

  def delete_sprint
    id = @sprint_id.get.to_i
    return Tk.messageBox('type' => 'ok', 'title' => 'Error', 'message' => 'Valid Sprint ID required!') if id <= 0
    error = @board.delete_sprint(id)
    if error
      Tk.messageBox('type' => 'ok', 'title' => 'Error', 'message' => error)
    else
      clear_sprint_inputs
      refresh_sprint_display
      Tk.messageBox('type' => 'ok', 'title' => 'Success', 'message' => "Sprint #{id} deleted!")
    end
  end

  def add_user
    error = @board.add_user(@user_name.get.strip, @user_email.get.strip)
    if error
      Tk.messageBox('type' => 'ok', 'title' => 'Error', 'message' => error)
    else
      clear_user_inputs
      refresh_user_display
      Tk.messageBox('type' => 'ok', 'title' => 'Success', 'message' => 'User added!')
    end
  end

  def delete_user
    id = @user_id.get.to_i
    return Tk.messageBox('type' => 'ok', 'title' => 'Error', 'message' => 'Valid User ID required!') if id <= 0
    error = @board.delete_user(id)
    if error
      Tk.messageBox('type' => 'ok', 'title' => 'Error', 'message' => error)
    else
      clear_user_inputs
      refresh_user_display
      Tk.messageBox('type' => 'ok', 'title' => 'Success', 'message' => "User #{id} deleted!")
    end
  end

  def refresh_task_display
    @task_display.winfo_children.each(&:destroy)
    ScrumBoard::STATUSES.each_with_index do |status, i|
      frame = TkFrame.new(@task_display).pack(side: :left, fill: :y, padx: 10)
      TkLabel.new(frame) { text status; font 'Arial 12 bold' }.pack(pady: 5)
      tasks = @board.tasks.select { |t| t.status == status }
      tasks = tasks.select { |t| t.sprint_id == @filter_sprint.get.to_i } unless @filter_sprint.get.empty?
      tasks = tasks.select { |t| t.assignee == @filter_assignee.get.strip } unless @filter_assignee.get.empty?
      tasks.each do |t|
        TkLabel.new(frame) { text "ID: #{t.id}, Title: #{t.title}, Assignee: #{t.assignee || 'None'}, Points: #{t.story_points}, Sprint: #{t.sprint_id || 'None'}" }.pack(anchor: 'w', pady: 2)
      end
    end
  end

  def refresh_sprint_display
    @sprint_display.winfo_children.each(&:destroy)
    @board.sprints.each do |s|
      TkLabel.new(@sprint_display) { text "ID: #{s.id}, Name: #{s.name}, Start: #{s.start_date}, End: #{s.end_date}" }.pack(anchor: 'w', pady: 2)
    end
  end

  def refresh_user_display
    @user_display.winfo_children.each(&:destroy)
    @board.users.each do |u|
      TkLabel.new(@user_display) { text "ID: #{u.id}, Name: #{u.name}, Email: #{u.email}" }.pack(anchor: 'w', pady: 2)
    end
  end

  def clear_task_inputs
    @task_title.delete(0, 'end')
    @task_desc.delete(0, 'end')
    @task_assignee.delete(0, 'end')
    @task_points.delete(0, 'end')
    @task_sprint.delete(0, 'end')
    @task_id.delete(0, 'end')
    @task_status.value = "To Do"
  end

  def clear_sprint_inputs
    @sprint_name.delete(0, 'end')
    @sprint_start.delete(0, 'end')
    @sprint_end.delete(0, 'end')
    @sprint_id.delete(0, 'end')
  end

  def clear_user_inputs
    @user_name.delete(0, 'end')
    @user_email.delete(0, 'end')
    @user_id.delete(0, 'end')
  end

  def run
    Tk.mainloop
  end
end

# Run the application
ScrumGUI.new.run
