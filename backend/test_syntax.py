import ast
import sys

def check_server_syntax():
    with open('c:/bug fix 4/DentalSuthra/backend/server.py', 'r', encoding='utf-8') as f:
        tree = ast.parse(f.read())
    
    print("Syntax is valid.")

if __name__ == "__main__":
    try:
        check_server_syntax()
    except SyntaxError as e:
        print(f"Syntax Error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
