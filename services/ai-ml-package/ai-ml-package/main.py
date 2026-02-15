import multiprocessing
import subprocess
import os
import sys

def run_service(service_name, port):
    """Run a single AI-ML service."""
    try:
        # Change to the service directory
        service_dir = os.path.join(os.path.dirname(__file__), '..', service_name)
        os.chdir(service_dir)

        # Run the service
        cmd = [sys.executable, '-m', 'uvicorn', 'src.main:app', '--host', '0.0.0.0', '--port', str(port)]
        subprocess.run(cmd, check=True)
    except subprocess.CalledProcessError as e:
        print(f"Error running {service_name}: {e}")
    except Exception as e:
        print(f"Unexpected error for {service_name}: {e}")

def main():
    """Run all AI-ML services simultaneously."""
    services = [
        ('chatbot-service', 3009),
        ('demand-forecasting-service', 3006),
        ('pricing-service', 3007),
        ('recommendation-service', 3005)
    ]

    processes = []
    for service_name, port in services:
        p = multiprocessing.Process(target=run_service, args=(service_name, port))
        processes.append(p)
        p.start()

    # Wait for all processes to complete
    for p in processes:
        p.join()

if __name__ == '__main__':
    main()
