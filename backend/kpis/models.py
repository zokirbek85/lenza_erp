from django.db import models


class KPIRecord(models.Model):
    dealer = models.ForeignKey('dealers.Dealer', on_delete=models.CASCADE, related_name='kpi_records')
    name = models.CharField(max_length=120)
    value = models.DecimalField(max_digits=12, decimal_places=2)
    recorded_at = models.DateField()
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('dealer', 'name', 'recorded_at')
        ordering = ('-recorded_at',)

    def __str__(self) -> str:
        return f"{self.dealer} - {self.name}"
