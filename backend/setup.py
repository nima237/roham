import os
import subprocess
import sys


def run_command(command):
    subprocess.run(command, shell=True, check=True)


def main():
    # Create Django project
    run_command("django-admin startproject config .")

    # Create apps directory
    os.makedirs("apps", exist_ok=True)

    # Create core app
    run_command("python manage.py startapp core apps/core")

    # Create necessary directories
    os.makedirs("apps/core/management/commands", exist_ok=True)
    os.makedirs("apps/core/templates", exist_ok=True)
    os.makedirs("apps/core/static", exist_ok=True)
    os.makedirs("apps/core/tests", exist_ok=True)

    # Create __init__.py files
    open("apps/__init__.py", "a").close()
    open("apps/core/management/__init__.py", "a").close()
    open("apps/core/management/commands/__init__.py", "a").close()

    print("Project structure created successfully!")


if __name__ == "__main__":
    main()
