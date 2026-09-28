import pyautogui
import math
import time
import sys

def draw_circle_with_mouse(center_x, center_y, radius, num_points=360, delay=0.01):
    """
    Draw a perfect circle by moving the mouse with left button held down.
    
    Args:
        center_x (int): X coordinate of circle center
        center_y (int): Y coordinate of circle center
        radius (int): Radius of the circle in pixels
        num_points (int): Number of points to draw (higher = smoother circle)
        delay (float): Delay between each mouse movement (seconds)
    """
    
    # Enable pyautogui failsafe (move mouse to top-left corner to stop)
    pyautogui.FAILSAFE = True
    
    # Validate inputs
    if radius <= 0:
        raise ValueError("Radius must be positive")
    if num_points <= 0:
        raise ValueError("Number of points must be positive")
    if delay < 0:
        raise ValueError("Delay cannot be negative")
    
    # Check if circle fits on screen
    screen_width, screen_height = pyautogui.size()
    if (center_x - radius < 0 or center_x + radius > screen_width or 
        center_y - radius < 0 or center_y + radius > screen_height):
        print(f"Warning: Circle may extend beyond screen boundaries!")
        print(f"Screen size: {screen_width}x{screen_height}")
        print(f"Circle bounds: ({center_x-radius}, {center_y-radius}) to ({center_x+radius}, {center_y+radius})")
    
    
    print(f"Drawing circle at center ({center_x}, {center_y}) with radius {radius}")
    print("Move mouse to top-left corner to emergency stop")
    print("Starting in 3 seconds...")
    
    # Countdown
    for i in range(3, 0, -1):
        print(f"{i}...")
        time.sleep(1)
    
    try:
        # Calculate starting position (rightmost point of circle)
        start_x = center_x + radius
        start_y = center_y
        
        # Move to starting position
        pyautogui.moveTo(start_x, start_y)
        time.sleep(0.1)  # Small pause before starting
        
        # Press and hold left mouse button
        pyautogui.mouseDown(button='left')
        
        # Draw the circle
        for i in range(num_points + 1):  # +1 to complete the circle
            # Calculate angle (0 to 2π)
            angle = (2.0 * math.pi * i) / num_points
            
            # Calculate x, y coordinates on the circle
            x = center_x + radius * math.cos(angle)
            y = center_y + radius * math.sin(angle)
            
            # Ensure coordinates are within screen bounds
            x = max(0, min(screen_width - 1, int(round(x))))
            y = max(0, min(screen_height - 1, int(round(y))))
            
            # Move mouse to the calculated position
            pyautogui.moveTo(x, y)
            
            # Small delay for smooth drawing
            if delay > 0:
                time.sleep(delay)
        
        print("Circle drawing completed!")
        
    except pyautogui.FailSafeException:
        print("Emergency stop activated!")
        return False
    except KeyboardInterrupt:
        print("\nScript interrupted by user!")
        return False
    except Exception as e:
        print(f"Error occurred: {e}")
        return False
    finally:
        # Ensure mouse button is released
        try:
            pyautogui.mouseUp(button='left')
        except:
            pass  # Ignore any errors when releasing mouse
    
    return True

def main():
    # Get screen dimensions for reference
    screen_width, screen_height = pyautogui.size()
    print(f"Screen size: {screen_width}x{screen_height}")
    
    # Circle parameters - adjust these as needed
    center_x = screen_width // 2    # Center of screen
    center_y = screen_height // 2   # Center of screen
    radius = 100                    # Circle radius in pixels
    num_points = 360               # Number of points (smoothness)
    delay = 0.005                  # Delay between movements (speed)
    
    # You can also customize the circle:
    # center_x = 500     # Custom X center
    # center_y = 400     # Custom Y center
    # radius = 150       # Larger circle
    # num_points = 720   # Smoother circle (more points)
    # delay = 0.01       # Slower drawing
    
    draw_circle_with_mouse(center_x, center_y, radius, num_points, delay)

if __name__ == "__main__":
    main()
