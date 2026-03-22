import sys
import os

# Add the 'ml' directory to the path so 'src' can be imported
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

try:
    from src.pattern_recognition.detector import PatternDetector
    from src.opportunity_radar.radar import OpportunityRadar
    from src.backtesting.engine import BacktestEngine
    from src.llm_engine.explainer import LLMExplainer
    print("All imports successful!")
except Exception as e:
    print(f"Import Error: {e}")
    sys.exit(1)

def test_system():
    print("Testing instantiations...")
    try:
        detector = PatternDetector()
        print("PatternDetector instantiated.")
    except Exception as e:
        print(f"PatternDetector error: {e}")
        
    try:
        radar = OpportunityRadar()
        print("OpportunityRadar instantiated.")
    except Exception as e:
        print(f"OpportunityRadar error: {e}")
        
    try:
        engine = BacktestEngine()
        print("BacktestEngine instantiated.")
    except Exception as e:
        print(f"BacktestEngine error: {e}")
        
    try:
        explainer = LLMExplainer(api_key="sk-test-fake-key")
        print("LLMExplainer instantiated.")
    except Exception as e:
        print(f"LLMExplainer error: {e}")

if __name__ == "__main__":
    test_system()
