import { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Chart } from 'primereact/chart';

const VoiceComparisonChart = ({ storedEmbedding, newEmbedding, displayDimensions, height }) => {
  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        angleLines: { display: true },
        ticks: {
          showLabelBackdrop: false,
          font: { size: 8 }
        },
        pointLabels: {
          font: { size: 10 }
        }
      }
    },
    plugins: {
      legend: { position: 'top' },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.r !== null) {
              label += context.parsed.r.toFixed(2);
            }
            return label;
          }
        }
      }
    }
  }), []);

  const memoizedChartData = useMemo(() => {
    const labels = Array.from({ length: displayDimensions }, (_, i) => `Dim ${i + 1}`);
    const datasets = [];

    if (storedEmbedding && storedEmbedding.length > 0) {
      datasets.push({
        label: 'Stored Voice',
        data: storedEmbedding.slice(0, displayDimensions),
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        borderColor: 'rgb(255, 99, 132)',
        pointBackgroundColor: 'rgb(255, 99, 132)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgb(255, 99, 132)'
      });
    }

    if (newEmbedding && newEmbedding.length > 0) {
      datasets.push({
        label: 'New Voice',
        data: newEmbedding.slice(0, displayDimensions),
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        borderColor: 'rgb(54, 162, 235)',
        pointBackgroundColor: 'rgb(54, 162, 235)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgb(54, 162, 235)'
      });
    }

    return { labels, datasets };
  }, [storedEmbedding, newEmbedding, displayDimensions]);

  return (
    <div className="card flex justify-content-center p-4" style={{ height }}>
      <Chart 
        type="radar" 
        data={memoizedChartData} 
        options={chartOptions} 
        className="w-full" 
        style={{ height: '100%' }}
      />
    </div>
  );
};

VoiceComparisonChart.propTypes = {
  storedEmbedding: PropTypes.arrayOf(PropTypes.number),
  newEmbedding: PropTypes.arrayOf(PropTypes.number),
  displayDimensions: PropTypes.number.isRequired,
  height: PropTypes.string.isRequired
};

VoiceComparisonChart.defaultProps = {
  storedEmbedding: [],
  newEmbedding: []
};

export default VoiceComparisonChart;
